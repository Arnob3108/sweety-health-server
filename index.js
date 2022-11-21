const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.esqm07b.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  console.log(req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      res.status(403).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const servicesCollection = client.db("sweetHealth").collection("services");
    const reviewsCollection = client.db("sweetHealth").collection("reviews");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });
      res.send({ token });
    });

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get("/threeservices", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const threeServices = await cursor.limit(3).toArray();
      res.send(threeServices);
    });

    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await servicesCollection.findOne(query);
      res.send(service);
    });

    app.post("/services", async (req, res) => {
      const services = req.body;
      const result = await servicesCollection.insertOne(services);
      res.send(result);
    });

    // reviews-----

    app.get("/reviews", async (req, res) => {
      let query = {};
      if (req.query.service) {
        query = {
          "reviews.service": req.query.service,
        };
      }
      const cursor = reviewsCollection.find(query).sort({ time: -1 });
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    app.get("/myreviews", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      console.log("inside oders api", decoded);
      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: "unauthorized access" });
      }
      // console.log(req.headers.authorization);
      let query = {};
      if (req.query.email) {
        query = {
          "reviews.email": req.query.email,
        };
      }
      const cursor = reviewsCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    app.post("/reviews", async (req, res) => {
      const reviews = req.body;
      const result = await reviewsCollection.insertMany([
        { reviews: reviews, time: new Date() },
      ]);
      res.send(result);
    });

    app.patch("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const reviews = req.body;
      const updatedField = {
        $set: {
          reviews: reviews,
        },
      };
      const result = await reviewsCollection.updateOne(query, updatedField);
      res.send(result);
    });

    app.delete("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}

run().catch((error) => console.error(error));

app.get("/", (req, res) => {
  res.send("review server is running");
});

app.listen(port, () => {
  console.log(`server running on ${port}`);
});
