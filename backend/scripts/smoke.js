// End-to-end smoke test against a running RideGo API on :5000
const BASE = "http://localhost:5000/api";
let failures = 0;

function ok(name, cond, extra = "") {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  // Clean up any leftover active rides from previous runs so this test is re-runnable
  const login = await req("POST", "/auth/login", { body: { email: "admin@ridego.dev", password: "admin123" } });
  const list = await req("GET", "/admin/rides?limit=50", { token: login.data.token });
  for (const r of list.data.rides || []) {
    if (["REQUESTED", "SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "TRIP_STARTED"].includes(r.status)) {
      await req("PUT", `/admin/rides/${r._id}/cancel`, { token: login.data.token, body: { reason: "cleanup before smoke run" } });
    }
  }

  console.log("== Health ==");
  const health = await req("GET", "/health");
  ok("health", health.status === 200 && health.data.ok === true);

  console.log("== Auth ==");
  const bad = await req("POST", "/auth/login", { body: { email: "alex@ridego.dev", password: "wrong" } });
  ok("rejects bad password", bad.status === 401);

  const alex = await req("POST", "/auth/login", { body: { email: "alex@ridego.dev", password: "alex123" } });
  ok("passenger login", alex.status === 200 && alex.data.token && alex.data.user.role === "passenger");
  const passengerToken = alex.data.token;

  const michael = await req("POST", "/auth/login", { body: { email: "michael@ridego.dev", password: "driver123" } });
  ok("driver login", michael.status === 200 && michael.data.user.role === "driver");
  const driverToken = michael.data.token;

  const admin = await req("POST", "/auth/login", { body: { email: "admin@ridego.dev", password: "admin123" } });
  ok("admin login", admin.status === 200 && admin.data.user.role === "admin");
  const adminToken = admin.data.token;

  const me = await req("GET", "/auth/me", { token: passengerToken });
  ok("auth/me returns user", me.status === 200 && me.data.user.email === "alex@ridego.dev");

  console.log("== Fare estimate ==");
  const pickup = { address: "Downtown Central Station", latitude: 40.758, longitude: -73.9855 };
  const destination = { address: "International Airport Terminal 3", latitude: 40.6413, longitude: -73.7781 };

  const est = await req("POST", "/rides/estimate", { token: passengerToken, body: { pickup, destination } });
  ok(
    "estimate returns 3 quotes",
    est.status === 200 && est.data.quotes.length === 3 && est.data.quotes[0].subtotal > 0,
    JSON.stringify(est.data).slice(0, 120)
  );
  const economy = est.data.quotes.find((q) => q.rideType === "economy");

  console.log("== Promo validation ==");
  const promo = await req("POST", "/promos/validate", { token: passengerToken, body: { code: "RIDE20", subtotal: economy.subtotal } });
  ok("RIDE20 gives 20% off", promo.status === 200 && Math.abs(promo.data.discount - economy.subtotal * 0.2) < 0.01);
  const badPromo = await req("POST", "/promos/validate", { token: passengerToken, body: { code: "NOPE", subtotal: 20 } });
  ok("invalid promo rejected", badPromo.status === 404);

  console.log("== Booking ==");
  const book = await req("POST", "/rides", {
    token: passengerToken,
    body: { pickup, destination, rideType: "economy", paymentMethod: "card", promoCode: "RIDE20" },
  });
  ok(
    "ride booked and searching",
    book.status === 201 && book.data.ride.status === "SEARCHING_DRIVER" && book.data.ride.discount > 0,
    JSON.stringify(book.data).slice(0, 200)
  );
  const rideId = book.data.ride?._id;
  ok("ride PIN generated", /^\d{4}$/.test(book.data.ride?.ridePin || ""));

  const dup = await req("POST", "/rides", { token: passengerToken, body: { pickup, destination, rideType: "economy" } });
  ok("duplicate active ride blocked", dup.status === 409);

  console.log("== Driver flow ==");
  const accepted = await req("POST", `/rides/${rideId}/accept`, { token: driverToken });
  ok("driver accepts ride", accepted.status === 200 && accepted.data.ride.status === "DRIVER_ASSIGNED");

  const notMine = await req("PUT", `/rides/${rideId}/status`, {
    token: (await req("POST", "/auth/login", { body: { email: "david@ridego.dev", password: "driver123" } })).data.token,
    body: { status: "DRIVER_ARRIVING" },
  });
  ok("other driver cannot update ride", notMine.status === 403);

  // This ride pays by card, so completing the trip leaves it awaiting payment (not auto-paid)
  for (const status of ["DRIVER_ARRIVING", "DRIVER_ARRIVED", "TRIP_STARTED", "TRIP_COMPLETED"]) {
    const step = await req("PUT", `/rides/${rideId}/status`, { token: driverToken, body: { status } });
    ok(`status -> ${status}`, step.status === 200 && step.data.ride.status === status);
  }

  // Cash rides auto-complete to PAYMENT_COMPLETED when the driver ends the trip
  const cashBook = await req("POST", "/rides", {
    token: passengerToken,
    body: { pickup: { address: "Grandview Shopping Mall", latitude: 40.7411, longitude: -73.9897 }, destination: { address: "Old Harbor Waterfront", latitude: 40.7005, longitude: -74.0149 }, rideType: "economy", paymentMethod: "cash" },
  });
  ok("cash ride booked after previous trip completed", cashBook.status === 201, JSON.stringify(cashBook.data).slice(0, 120));
  if (cashBook.status === 201) {
    await req("POST", `/rides/${cashBook.data.ride._id}/accept`, { token: driverToken });
    for (const status of ["DRIVER_ARRIVING", "DRIVER_ARRIVED", "TRIP_STARTED", "TRIP_COMPLETED"]) {
      await req("PUT", `/rides/${cashBook.data.ride._id}/status`, { token: driverToken, body: { status } });
    }
    const cashDone = await req("GET", `/rides/${cashBook.data.ride._id}`, { token: passengerToken });
    ok("cash ride auto-marks payment completed", cashDone.data.ride?.status === "PAYMENT_COMPLETED" && cashDone.data.ride?.paymentStatus === "PAID");
  }

  console.log("== Payment ==");
  const pay = await req("POST", "/payments/pay", {
    token: passengerToken,
    body: { rideId, method: "card", card: { brand: "Visa", last4: "4242" } },
  });
  ok("card payment succeeds", pay.status === 200 && pay.data.payment.status === "PAID" && pay.data.payment.cardLast4 === "4242");
  const payAgain = await req("POST", "/payments/pay", { token: passengerToken, body: { rideId, method: "card" } });
  ok("double payment blocked", payAgain.status === 409 || payAgain.status === 400);

  console.log("== Rating ==");
  const rate = await req("POST", `/rides/${rideId}/rate`, { token: passengerToken, body: { rating: 5, comment: "Perfect ride" } });
  ok("passenger rates ride", rate.status === 201);
  const rateTwice = await req("POST", `/rides/${rideId}/rate`, { token: passengerToken, body: { rating: 4 } });
  ok("double rating blocked", rateTwice.status === 409);

  console.log("== History & wallet ==");
  const hist = await req("GET", "/rides/history", { token: passengerToken });
  ok("ride history has the new ride", hist.status === 200 && hist.data.total >= 7, `total=${hist.data?.total}`);

  const topUp = await req("POST", "/payments/wallet/topup", { token: passengerToken, body: { amount: 25 } });
  ok("wallet top-up", topUp.status === 200 && topUp.data.walletBalance > 0);

  console.log("== Admin ==");
  const stats = await req("GET", "/admin/stats", { token: adminToken });
  ok("admin stats", stats.status === 200 && stats.data.rides >= 7 && stats.data.revenue > 0);
  const statsForbidden = await req("GET", "/admin/stats", { token: passengerToken });
  ok("admin routes blocked for passenger", statsForbidden.status === 403);

  const pending = await req("GET", "/admin/drivers", { token: adminToken });
  const pendingDriver = pending.data.drivers.find((d) => d.status === "PENDING");
  const approvedDriver = pending.data.drivers.find((d) => d.status === "APPROVED");
  ok("driver list readable", pending.status === 200 && (Boolean(pendingDriver) || Boolean(approvedDriver)));
  if (pendingDriver) {
    const approved = await req("PUT", `/admin/drivers/${pendingDriver._id}/approve`, { token: adminToken });
    ok("admin approves driver", approved.status === 200 && approved.data.driver.status === "APPROVED");
  } else {
    console.log("  SKIP  admin approves driver (no pending driver left — already approved in an earlier run)");
  }

  const analytics = await req("GET", "/admin/analytics", { token: adminToken });
  ok("analytics aggregates", analytics.status === 200 && Array.isArray(analytics.data.ridesByDay));

  console.log("== Support ==");
  const ticket = await req("POST", "/support", {
    token: passengerToken,
    body: { subject: "Smoke test ticket", message: "Created by automated test", category: "GENERAL" },
  });
  ok("support ticket created", ticket.status === 201);
  const tickets = await req("GET", "/admin/tickets", { token: adminToken });
  ok("admin lists tickets", tickets.status === 200 && tickets.data.tickets.length >= 1);

  console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
