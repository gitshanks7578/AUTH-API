import autocannon from "autocannon";

autocannon(
  {
    url: "http://localhost:8000/api/v1/auth/login",
    method: "POST",
    connections: 50,
    duration: 30,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "bro@g.com",
      password: "1",
    }),
  },
  (err, result) => {
    if (err) throw err;
    console.log(result);
  }
);