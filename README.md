# PANTOhealth — IoT X-Ray Data Management (NestJS + RabbitMQ + MongoDB)

Process x-ray telemetry from IoT devices via RabbitMQ, persist computed metrics in MongoDB, and expose REST APIs for querying and managing signals.

## ✨ What’s inside

* **RabbitMQ Consumer & Producer**

  * `RabbitMQService` consumes `x-ray-data-queue` messages, validates/normalizes, and forwards to `SignalsService`.
  * `DataProducerService` emits sample x-ray messages (triggered by `AppService` every 30s after connect).
* **Signals Storage & Processing**

  * Mongoose model for signals with computed fields:

    * `deviceId`, `time`, `dataLength`, `dataVolume`, `data`, `createdAt`
  * `SignalsService` handles create, list (with filters), find, update (recomputes metrics), and delete.
* **REST API (CRUD + filters)**
* **Unit Tests** for core services.
* **Postman collection**: `Panto Health.postman_collection.json`
* **Docker** artifacts (`Dockerfile`, `docker-compose.yml`)

---

## 🧱 Architecture

```
AppService  ──▶ DataProducerService ──emit──▶  RabbitMQ (x-ray-data-queue)
                                               │
RabbitMQService ◀─consume/normalize/validate───┘
     │
     └──▶ SignalsService ──▶ MongoDB (signals)
```

* **Metrics**:

  * `dataLength`: number of datapoints
  * `dataVolume`: For simplicity, we define dataVolume as the sum of the first element of each datapoint tuple
    (e.g. `[[1, …], [2, …]] → dataVolume = 3`)

* **Message format (producer → queue)**:

  ```json
  {
    "66bb584d4ae73e488c30a072": {
      "data": [
        [762,  [51.339764,        12.339223833333334, 1.2038000000000002]],
        [1766, [51.33977733333333,12.339211833333334, 1.531604]],
        [2763, [51.339782,        12.339196166666667, 2.13906]]
      ],
      "time": 1735683480000
    }
  }
  ```

---

## ⚙️ Requirements

* Node 20+ and Yarn (classic) **or** Docker
* MongoDB & RabbitMQ (locally or via Docker)

---

## 🚀 Getting Started (Local)

1. Install deps

```bash
yarn
```

2. Configure env (create `.env` in the project root and use the `.env` values that attached to the email)

```dotenv
# Mongo
MONGODB_URI=

# RabbitMQ
RABBITMQ_URL=
RABBITMQ_QUEUE=

# App
PORT=
```

3. Run the app

```bash
yarn start:dev
```

* On startup, `AppService` connects to RabbitMQ and every **30 seconds** publishes a sample x-ray message via `DataProducerService`.
* The consumer handles messages from `x-ray-data-queue` and stores processed signals.

> If you prefer *no background publishing*, comment out or disable the `setInterval` in `AppService`.

---

## 🐳 Running with Docker

> Adjust service names/ports if your `docker-compose.yml` differs.

```bash
docker-compose up --build
```

This typically brings up:

* the NestJS app
* MongoDB
* RabbitMQ (management UI usually at [http://localhost:15672](http://localhost:15672), app/upersecret)

---

## 📚 API Reference (Signals)

Base URL: `http://localhost:3000` (unless changed)

### Create

**POST** `/signals`

Body:

```json
{
  "deviceId": "66bb584d4ae73e488c30a072",
  "time": 1735683480000,
  "data": [
    [762,  [51.339764, 12.339223833333334, 1.2038000000000002]],
    [1766, [51.33977733333333, 12.339211833333334, 1.531604]]
  ]
}
```

### List (paged + filters)

**GET** `/signals`

Query parameters:

* `page` (default `1`)
* `limit` (default `20`)
* `sortOrder` = `newest` | `oldest` (default `newest`)
* `deviceId`
* `from`, `to` (timestamp range on `time`)
* `minDataLength`, `maxDataLength`
* `minVolume`, `maxVolume`

**Examples**

```
/signals?deviceId=66bb584d4ae73e488c30a072&from=1735683000000&to=1735684000000
/signals?minDataLength=2&maxDataLength=100&minVolume=10
/signals?page=2&limit=10&sortOrder=oldest
```

Returns:

```json
{
  "items": [ /* array of signals */ ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### Get by ID

**GET** `/signals/:id`

### Update

**PATCH** `/signals/:id`

Body (any subset):

```json
{
  "deviceId": "new-device",
  "time": 1735683500000,
  "data": [
    [1, [51.1, 12.1, 1.0]],
    [2, [51.2, 12.2, 1.5]]
  ]
}
```

> When `data` changes, `dataLength` and `dataVolume` are recomputed.

### Delete

**DELETE** `/signals/:id`

---

## 🧪 Testing

Run all tests:

```bash
yarn test
```

What’s covered:

* **SignalsService**: create (via processing), pagination & filters, find, update (recompute), delete, error paths
* **RabbitMQService**: payload normalization, stringified `data` parsing, validation errors, forward to SignalsService
* **DataProducerService**: connect success/failure; emits expected payload; failure returns `503`
* **AppService**: connects on init; schedules 30s publish interval; clears interval on shutdown

> Test output is clean; in error-path tests we locally mute `Logger` in each spec.

---

## 📨 Producer & Consumer details

* **Producer** (`DataProducerService`)

  * Emits to topic/queue: `x-ray-data-queue`
  * Payload uses the deviceId as the **object key**.
  * `AppService` calls `connect()` then publishes every 30s.

* **Consumer** (`RabbitMQService`)

  * `consumeXray(payload)`
  * Validates the payload:

    * payload must be an object with a **deviceId key**
    * `data` can be an **array** or a **JSON string** representing an array
    * non-array data or invalid JSON → `PayloadValidationError`
  * Logs a small debug line, then calls `SignalsService.processAndSaveXrayData(deviceId, { time, data })`

> Ensure your RabbitMQ module asserts/binds `x-ray-data-queue` on startup and routes messages to `consumeXray`.

---

## 🗂️ Postman

Import `Panto Health.postman_collection.json` into Postman and use the prepared requests for:

* Create signal
* List with filters
* Get by id
* Update
* Delete

---

## 🔐 Configuration

Typical environment variables:

```dotenv
MONGODB_URI=
RABBITMQ_URL=
RABBITMQ_QUEUE=
PORT=
```

Consider using `@nestjs/config` for type-safe config and to provide these values to the RMQ & Mongoose modules.

---

## 🧭 Notes & Assumptions

* For simplicity, `dataVolume` is defined as the sum of the first element of each datapoint tuple.
* Time is accepted as a number (ms since epoch).
* If an incoming message lacks `time`, it defaults to `Date.now()` during normalization.
* The producer module lives inside the same Nest app (per assignment, a separate app *or* module is acceptable).

---