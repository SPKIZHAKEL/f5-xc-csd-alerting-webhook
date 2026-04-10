const express = require('express');
const axios = require('axios');
const https = require('https');
const app = express();
app.use(express.json());

// ================= CONFIG =================
const TENANT = "<tenant>.console.ves.volterra.io";
const NAMESPACE = "<namespace>";
const API_TOKEN = "<token>";

const F5_API = `https://${TENANT}/api/shape/csd/namespaces/${NAMESPACE}/detected_domains`;

const SPLUNK_HEC = "https://<HOST>.splunkcloud.com:8088/services/collector/event"
const SPLUNK_TOKEN = <SPLUNK TOKEN>;
const SCRIPTS_URL = `https://${TENANT}/api/shape/csd/namespaces/${NAMESPACE}/scripts`

// ================= HELPERS =================
function epochToUTC(epoch) {
  const d = new Date(epoch * 1000);
  return d.toISOString().replace(".000Z", "Z");
}


async function getAffectedUsers(scriptId) {
  const payload = {
    script_id: scriptId,
    start_time: "1775001600",
    end_time: "1775692800"
  };

  const url = `https://${TENANT}/api/shape/csd/namespaces/${NAMESPACE}/scripts/${scriptId}/affectedUsers`;

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `APIToken ${API_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    const users = res.data.affected_users || [];

    const ips = new Set();

    for (const u of users) {
      if (u.ip_address) {
        ips.add(u.ip_address);
      }
    }

    return Array.from(ips);

  } catch (err) {
    console.error(`Affected Users API Error for script ${scriptId}:`, err.response?.status);
    return [];
  }
}

// ================= WEBHOOK =================
app.post('/f5-alert', async (req, res) => {
  console.log("Received alert from F5 XC");

  try {
    // ========= TIME RANGE =========
    const endTime = Math.floor(Date.now() / 1000);        // current time (seconds)
    const startTime = endTime - (30 * 60);                // last 30 mins

    console.log("Start:", startTime, "End:", endTime);

    // ========= PARAMS =========
    const params = {
      duration: 1,
      start_time: startTime,
      end_time: endTime,
      limit: 100
    };

    // ========= API CALL =========
    const response = await axios.get(F5_API, {
      headers: {
        Authorization: `APIToken ${API_TOKEN}`,
        "Content-Type": "application/json"
      },
      params
    });

    const data = response.data;
    const domains = data.domains_list || [];

    console.log(`Detected domains: ${domains.length}`);

    // ========= PROCESS =========
    for (const d of domains) {
      const domain = d.domain || "na";
      const risk = parseInt(d.riskScore || "0");
      const category = d.category || "na";
      const firstSeen = d.firstSeenDate || null;
      const status = d.status || "na";
      console.log(`domain: ${domain}`,domain)
      console.log(`risk: ${risk}`,risk)
      console.log(`category: ${category}`,category)
      console.log(`status: ${status}`,status)
      // Only send suspicious domains
      if (risk >= 0) {
        const payload = {
		event:{source: "f5_xc_csd_enriched",
            domain: domain,
            risk_score: risk,
            category: category,
            status: status,
            first_seen: firstSeen ? epochToUTC(firstSeen) : "na",
            detection_window: "last_30_min",
            timestamp: new Date().toISOString()
		}
		};

        // ========= SEND TO SPLUNK =========
        const agent = new https.Agent({
                 rejectUnauthorized: false
                 });
	 await axios.post(SPLUNK_HEC, payload, {
         	 httpsAgent:agent,
		 headers: {
            Authorization: `Splunk ${SPLUNK_TOKEN}`
          }
        });

        console.log(`Sent domain to Splunk: ${domain} (risk: ${risk})`);
        console.log("----------------------------------");
      }
    }
    
    params_script = {
    "start_time": "1775001600",
    "end_time": "1775692800",
    "limit": 100
    }
    //script related
    const scriptsResponse = await axios.get(SCRIPTS_URL, {
        headers: {
            Authorization: `APIToken ${API_TOKEN}`,
            "Content-Type": "application/json"
        },
        params: params_script
        });

    const scriptsData = scriptsResponse.data;
    console.log(scriptsData);

    const scripts = scriptsData.scripts || [];

    console.log(`\nScripts detected: ${scripts.length}\n`);

    for (const s of scripts) {
        console.log(s.id);
        console.log(s.script_name);
        console.log(s.risk_level);
        console.log(s.form_fields_read);
        console.log(s.locations);
        console.log(s.first_seen);
        console.log(s.last_seen);
        const ips = await getAffectedUsers(s.id);
        console.log(ips);
        const payload = {
		event:{
            source: "f5_xc_csd_enriched",
            script_id: s.id,
            script_name: s.script_name,
            risk_level: s.risk_level,
            form_fields_read:s.form_fields_read,
            locations:s.locations,
            first_seen: epochToUTC(s.first_seen),
            last_seen:epochToUTC(s.last_seen),
            detection_window: "last_30_min",
            ips:ips,
            timestamp: new Date().toISOString()
		}
		};

    console.log("----------------------------------------");
    
    // ========= SCRIPT SEND TO SPLUNK =========
        const agent = new https.Agent({
                 rejectUnauthorized: false
                 });
	    await axios.post(SPLUNK_HEC, payload, {
         	 httpsAgent:agent,
		 headers: {
            Authorization: `Splunk ${SPLUNK_TOKEN}`
          }
        });

        console.log(`Sent script to Splunk: ${s.id}`);
        console.log("----------------------------------");
    }
    res.sendStatus(200);

  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// ================= START =================
app.listen(4000, () => {
  console.log("Webhook running on port 4000");
});
