const express=require('express');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors=require('cors');
const port=process.env.PORT ||5000;

//middle ware
app.use(cors());
app.use(express.json());




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

    const userCollection=client.db('musicSchool').collection('users');
    const studentCollection=client.db('musicSchool').collection('students');
    const classesCollection=client.db('musicSchool').collection('classes');
    const teachersCollection=client.db('musicSchool').collection('teachers');
//user related api
app.post('/users',async(req,res)=>{
  const user=req.body;
  const query={email:user.email}
  const existingUser=await userCollection.findOne(query);
  if(existingUser){
    return res.send({message: 'User already exists'})
  }
  const result=await userCollection.insertOne(user);
  res.send(result)
})
  

//class related api
    app.get('classes',async(req,res)=>{
    const email=req.query.email;
    if(!email){
      res.send([])
    }
    const query={email:email}
    const result=await classesCollection.findOne(query).toArray();
    res.send(result);
    })
 
   app.get('/classes',async(req,res)=>{
    const result = await classesCollection.find().sort({ enrolled_students: -1 }).toArray();
   res.send(result);
   })
   //instructor related api
   app.get('/teachers',async(req,res)=>{
    const result = await teachersCollection.find().toArray();
   res.send(result);
   })

   app.post('/addClasses',async(req,res)=>{
    const item=req.body;
    console.log(item);
    const result =await studentCollection.insertOne(item);
    res.send(result);
   })
   app.get('/addClasses',async(req,res)=>{
    const result=await studentCollection.find().toArray();
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


app.get('/', (req,res) => {
 res.send('wellcome to musical school')
})

app.listen(port,()=>{
    console.log(`musical school running on ${port}`);
})