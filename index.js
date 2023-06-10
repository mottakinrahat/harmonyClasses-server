const express = require('express');
var jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const stripe=require('stripe')(process.env.PAYMENT_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const port = process.env.PORT || 5000;

//middle ware
app.use(cors());
app.use(express.json());
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.send.status(401).send({ error: true, message: 'unauthorized access' });
  }

  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dujofhq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('musicSchool').collection('users');
    const studentCollection = client.db('musicSchool').collection('students');
    const classesCollection = client.db('musicSchool').collection('classes');
    const teachersCollection = client.db('musicSchool').collection('teachers');
    const paymentCollection = client.db('musicSchool').collection('payments');

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
      res.send({ token });
    })
    //user related api

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    })
    app.get('/users/instructor/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' };
      res.send(result);
    })

    //create payment intent
  app.post('/create_payment_intent',async(req,res) => {
    const{price}=req.body;
    const amount=price*100;
    const paymentIntent=await stripe.paymentIntents.create({
      amount: amount,
      currency: 'USD',
      payment_method_types:['card']
    });
    res.send({
      clientSecret:paymentIntent.client_secret
    })
  })

  app.post('/payments',verifyJWT,async(req,res) => {
    const payment=req.body;
    const result=await paymentCollection.insertOne(payment)
    res.send(result);
  })

    //student
    app.get('/users/student/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { student: user?.role === 'student' };
      res.send(result);
    })

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


    //class related api
    app.get('classes', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.send.status(403).send({ error: true, message: 'forbidden access' });
      }

      const query = { email: email }
      const result = await classesCollection.findOne(query).toArray();
      res.send(result);
    })
    app.post('/classes', async (req, res) => {
      const item = req.body;
      const result = await classesCollection.insertOne(item);
      res.send(result);

    })

    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().sort({ enrolled_students: -1 }).toArray();
      res.send(result);
    })
    //instructor related api
    app.get('/teachers', async (req, res) => {
      const result = await teachersCollection.find().toArray();
      res.send(result);
    })

    app.patch('/addClasses', async (req, res) => {
      const item = req.body;
      const result = await studentCollection.insertOne(item);

      const classId=item.classId;
      const filter={_id:new ObjectId(classId)}
      const classData = await classesCollection.findOne(filter);
      console.log('class-data',classData);
      if (classData.available_sits === 0) {
        return res.status(400).send({ error: true, message: 'Class is full. No available seats.' });
      }
    
      const updateDoc={
        $inc:{available_sits:-1,enrolled_students:+1}
      };
     const updateResult=await classesCollection.updateOne(filter, updateDoc);
     console.log(updateResult);
      res.send(updateResult);

    })
    app.get('/addClasses', async (req, res) => {
      const result = await studentCollection.find().toArray();
      res.send(result);
    })

    app.get('/oneClass', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }
      const query = { email: email }
      const result = await studentCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/nextClasses', async (req, res) => {
      const email = req.query.email;
     
      if (!email) {
        res.send([])
      }
      const query = { email: email }
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/oneClass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await studentCollection.deleteOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //  await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('wellcome to musical school')
})

app.listen(port, () => {
  console.log(`musical school running on ${port}`);
})