# f5-xc-csd-alerting-webhook
web hook demo for alerts to be send with metadata to splunk cloud

# 🚀 F5 XC Client-Side Defense → Splunk Integration (PoC)

## 📌 Overview

This project demonstrates the following:

* **F5 Distributed Cloud (Client-Side Defense)**
* **Webhook-based alerting**
* **API-driven enrichment**
* **Splunk SIEM ingestion and correlation**

The goal is to detect **suspicious client-side activity (e.g., malicious domains/scripts)** and enrich it with contextual data before sending it to Splunk for analysis.

---

## 🧩 Architecture

```
Attacker → Victim App (Login Page) → F5 XC (CSD)
                                      ↓
                               Alert Trigger
                                      ↓
                                Webhook API
                                      ↓
                    F5 XC Shape APIs (Enrichment)
                                      ↓
                                Splunk (HEC)
                                      ↓
                          Detection & Correlation
```

---

## ⚙️ Components

### 1. Victim Application

* Simple login page (Node.js / Express)
* Protected by F5 XC WAF + Client-Side Defense

### 2. Attacker Simulation

* Injects malicious script (e.g., suspicious domain)

### 3. Webhook Service (Core Logic)

* Receives alert from F5 XC
* Calls CSD APIs:

  * `detected_domains`
  * `scripts`
  * `affectedUsers`
* Enriches data
* Sends structured JSON to Splunk

### 4. Splunk

* Receives logs via HTTP Event Collector (HEC)
* Enables correlation and alerting

---

## 🔌 APIs Used

### F5 XC Client-Side Defense APIs

* `GET /api/shape/csd/namespaces/{namespace}/detected_domains`
* `GET /api/shape/csd/namespaces/{namespace}/scripts`
* `POST /api/shape/csd/namespaces/{namespace}/scripts/{script_id}/affectedUsers`

---

## 🐳 Deployment (Docker)

### Run containers 

```bash
# Victim app
docker run -d -p 3000:3000 victim

# Attacker
docker run -d -p 5000:5000 attacker

# Webhook service
docker build -t f5-webhook .
docker run -d -p 4000:4000 f5-webhook
```
### OR Run Docker compose file

if using aws ec2 linux:
```bash
DOCKER_BUILDKIT=0 docker-compose up -d --build
```
for stopping and removing containers

```bash
docker-compose down
```
---

## 🌐 Webhook Configuration

In F5 XC:

* Create **Alert Receiver (Webhook)**
* select Client authentication none option
* Enter Webhook URL:

```
http://<EC2-PUBLIC-IP>:4000/f5-alert
```
* Trigger:

  * Client-Side Defense → Suspicious Domain


imp:
Also for CSD JS injection:
Inside the route inject under js injection -> select after title tag -> script name and then verify if injection is proper (post starting of victim-app dockerfile)



---

## 🔐 Environment Variables

Update in `server.js`:

```js
const TENANT = "<tenant>.console.ves.volterra.io";
const NAMESPACE = "<namespace>";
const API_TOKEN = "<F5_API_TOKEN>";

const SPLUNK_HEC = "https://<splunk-ip>:8088/services/collector";
const SPLUNK_TOKEN = "<HEC_TOKEN>";
```

---

## 📥 Splunk Setup

1. Enable **HTTP Event Collector (HEC)** : Settings->Data inputs-> if free instance (14 days) first create new token then edit global settings
2. Create token
3. Use:

   * Index: `f5_csd`
   * Sourcetype: `_json`
4. The Splunk instance (for cloud URL) format should be ```https://<HOST>.splunkcloud.com:8088/services/collector/event```

---

## 📊 Sample Domain Event Sent to Splunk

```json
{ [-]
   category: Unknown
   detection_window: last_30_min
   domain: example-attacker1.com
   first_seen: 2026-04-08T19:30:17Z
   risk_score: 0
   source: f5_xc_csd_enriched
   status: No Action Needed
   timestamp: 2026-04-09T12:22:02.293Z
}
```

---

## 📊 Sample Script Event Sent to Splunk

```json
{ [-]
   detection_window: last_30_min
   first_seen: 2026-03-30T04:00:18Z
   form_fields_read: 0
   ips: [ [+]
   ]
   last_seen: 2026-04-03T16:30:32Z
   locations: [ [+]
   ]
   risk_level: High Risk
   script_id: <id>
   script_name: http://<ec2>:3000/malicious.js
   source: f5_xc_csd_enriched
   timestamp: 2026-04-09T12:22:07.682Z
}
```

---

## 🔍 Example Splunk Queries

### Suspicious scripts by IP

```spl
index=f5_csd
| stats values(script_name) by ips
```

### High-risk scripts

```spl
index=f5_csd
| where risk="high"
```

### Correlation: multiple scripts per IP

```spl
index=f5_csd
| stats dc(script_id) as scripts by ips
| where scripts > 2
```

---

## 🧪 Testing the Webhook

```bash
curl -X POST http://<EC2-IP>:4000/f5-alert \
  -H "Content-Type: application/json" \
  -d '{"test":"alert trigger"}'
```

---

## ⚡ Demo Flow

1. Load victim app
2. Inject malicious script
3. F5 XC detects suspicious domain
4. Alert triggers webhook
5. Webhook:

   * Fetches domains, scripts, affected users
6. Sends enriched data to Splunk
7. Splunk dashboard updates + alerts fire

---

## 📌 Notes

* Ensure EC2 security group allows:

  * Port 4000 (Webhook)
* Use UTC timestamps for API consistency

---

