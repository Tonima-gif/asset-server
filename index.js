require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express();
const jwt =require('jsonwebtoken')
const stripe=require('stripe')(process.env.SECRET_PAYMENT_KEY)
const port = process.env.PORT || 5000 ;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v4o8q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

const userCollection = client.db("application").collection("users")
const assetsCollection = client.db("application").collection("assets")
const requestCollection = client.db("application").collection("requests")


// generate token  jwt

app.post('/jwt',(req,res)=>{
    const email=req.body
   const token= jwt.sign(email,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'365d'})
   res.send({token})
  })

const verifyToken=(req,res,next)=>{
  if(!req.headers.authorization){
    return res.status(401).send({message:"unAuthorize access token"})
  }
  const token = req.headers.authorization.split(' ')[1];
jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
  if(err){
    return res.status(403).send({message:"forbidden access token"})
  }
  req.decoded=decoded
  next()
})
}

const verifyAdmin=async(req,res,next)=>{
const email =req.decoded.email
const query ={email:email}
const user =await userCollection.findOne(query)
const isAdmin=user?.role=="HrAdmin"
if(!isAdmin){
  return res.status(403).send({message:"forbidden access Admin"})
}
next()
}


app.get("/allUser/:roleUser",async(req,res)=>{
  const roleUser = req.params.roleUser
  const query ={role:roleUser}
const allUsers = await userCollection.find(query).toArray()
res.send(allUsers)
})

app.get("/admin/:email",async(req,res)=>{
  const email = req.params.email
  const query = {email:email}
  const user = await userCollection.findOne(query)
let admin=false
if(user){
  admin = user?.role=="HrAdmin"
}
res.send({admin})
})
app.get("/employee/:email",async(req,res)=>{
  const email = req.params.email
  const query = {email:email}
  const user = await userCollection.findOne(query)
let employee=false
if(user){
  employee = user?.role=="employee"
}
res.send({employee})
})

app.get('/asset/:email',async(req,res)=>{
  const email=req.params.email
  let query={addHrEmail:email}
  const sort=req.query.sort
  const search=req.query.search
let options={}
if(search){
  query={productName:{$regex:search ,$options:'i'}}
}
  if(sort){
    options={sort : {productQuantity : -1}}
  }
  const result= await assetsCollection.find(query,options).toArray()
  res.send(result)
})

app.get('/employeeAssets/:email',async(req,res)=>{
  const email=req.params.email
  let query={addHrEmail:email}
  const sort=req.query.sort
  const search=req.query.search
let options={}
if(search){
  query={productName:{$regex:search ,$options:'i'}}
}
  if(sort){
    options={sort : {productQuantity : -1}}
  }
  const result= await assetsCollection.find(query,options).toArray()
  res.send(result)
})

app.get('/employeeRequestsAssets/:email',async(req,res)=>{
  const email=req.params.email
  let query={requesterEmail:email}
  const search=req.query.search
if(search){
  query={itemName:{$regex:search ,$options:'i'}}
}
  const result= await requestCollection.find(query).toArray()
  res.send(result)
})

app.get('/sortRequest/:email',async(req,res)=>{
  const email=req.params.email
  const query={requesterEmail:email}
  let options={sort : {requestDate : -1}}
  const result = await requestCollection.find(query,options).toArray()
res.send(result)
})


app.get('/update/:id',verifyToken,verifyAdmin,async(req,res)=>{
  const id =req.params.id
  const query={_id : new ObjectId(id)}
  const result=await assetsCollection.findOne(query)
  res.send(result)
})

app.get('/employeeInfo/:email',verifyToken,async(req,res)=>{
  const email=req.params.email
  const query ={HrEmail:email}
  const result = await userCollection.find(query).toArray()
  res.send(result)
})

app.get('/oneEmployee/:email',async(req,res)=>{
  const email =req.params.email
  const query={email:email}
  const result= await userCollection.findOne(query)
  res.send(result)
})

app.get('/sameTeam/:email',async(req,res)=>{
const email=req.params.email
const query={HrEmail:email}
const result=await userCollection.find(query).toArray()
res.send(result)

})

app.get('/allRequestsForHr/:email',verifyToken,verifyAdmin,async(req,res)=>{
const email=req.params.email
let query={itemHrEmail:email}
const search=req.query.search
if(search){
  query={requesterName:{$regex:search ,$options:'i'}}
}
const result= await requestCollection.find(query).toArray()
res.send(result)
})

app.post('/users',async(req,res)=>{
const user = req.body;
const query ={email :user.email}
const exist=await userCollection.findOne(query)
if(exist){
  return res.send({message:"user already exist in db",insertedId:null})
}
const result = await userCollection.insertOne(user);
res.send(result)
})

app.post('/addAsset',verifyToken,verifyAdmin,async(req,res)=>{
  const asset=req.body
  const result=await assetsCollection.insertOne(asset)
  res.send(result)
})

app.post('/addRequests',verifyToken,async(req,res)=>{
const itemInfo=req.body
const result=await requestCollection.insertOne(itemInfo)
res.send(result)
})

app.patch('/approved/:id',verifyToken,verifyAdmin,async(req,res)=>{
  const id=req.params.id
  const itemId=req.body.itemId
  const query={_id : new ObjectId(id)}
  const query2={_id : new ObjectId(itemId)}
  const update={
    $set:{status : "approved" ,approvalDate:new Date()}
  }
  const updatedDoc={
    $inc:{productQuantity : -1}
  }
  const result = await assetsCollection.updateOne(query2,updatedDoc)
  const result2 = await requestCollection.updateOne(query,update)
  res.send(result2)
})
app.patch('/reject/:id',verifyToken,verifyAdmin,async(req,res)=>{
  const id=req.params.id
  const query={_id : new ObjectId(id)}
  const update={
    $set:{status : "rejected"}
  }
  const result2 = await requestCollection.updateOne(query,update)
  res.send(result2)
})

app.get("/hr/:email",async(req,res)=>{
  const email= req.params.email
  const query={email:email}
  const result = await userCollection.findOne(query)
  res.send(result)
})

app.post('/create-payment-intent',verifyToken,async(req,res)=>{
  const price=req.body.price
  const amount = parseInt(price * 100)
  const paymentIntent = await stripe.paymentIntents.create({
    amount:amount,
    currency:'usd',
payment_method_types:["card"]
  })
  res.send({clientSecret : paymentIntent.client_secret})
})

app.put("/memberUpdate/:email",verifyToken,verifyAdmin,async(req,res)=>{
 const email =req.params.email
 const queryEmail={email:email}
 const{member}=req.query
 if(!member){
  return res.send({message:"queryMember nai"})
 }
 if(member<0){
  return res.send({message:"queryMember nai is 0"})
 }
 
const update={
  $set:{addMember:parseInt(member)}
}
const result = await userCollection.updateOne(queryEmail,update)
res.send(result)
})

app.patch("/hrRoleUpdate/:email",verifyToken,async(req,res)=>{
const email =req.params.email
const query={email:email}
const update={
  $set:{role:"HrAdmin",pack:0}
}
const result = await userCollection.updateOne(query,update)
res.send(result)
})

app.put('/addEmployee/:id',verifyToken,verifyAdmin,async(req,res)=>{
  const infoOfEmployee =req.body
  const id=req.params.id
  const query={_id:new ObjectId(id)}
  const hrEmail=infoOfEmployee.HrEmail
  const hrQuery={email:hrEmail}
  const updatedDoc={
    $set:{
      role:infoOfEmployee.role,
      companyLogo:infoOfEmployee.companyLogo,
      companyName:infoOfEmployee.companyName,
      HrEmail:infoOfEmployee.HrEmail
    }
  }
  const updatedDoc2={
    $inc:{addMember : -1,employeeMember : + 1}
  }
  const result2=await userCollection.updateOne(hrQuery,updatedDoc2)
 const result=await userCollection.updateOne(query,updatedDoc)
 res.send(result)
})

app.put('/updateAsset/:id',verifyToken,verifyAdmin,async(req,res)=>{
  const id=req.params.id
  const query={_id :new ObjectId (id)}
  const asset=req.body
  const updatedDoc={
    $set:{
      productName:asset.productName,
      productPhoto:asset.productPhoto,
      productQuantity:asset.productQuantity,
      productType:asset.productType,
      date:asset.date ,
      addHrEmail:asset.addHrEmail,
      addHrPhoto:asset.addHrPhoto,
      addHrName:asset.addHrName
    }
  }
  const result = await assetsCollection.updateOne(query,updatedDoc)
  res.send(result)
})

app.delete('/assetDelete/:id',verifyToken,verifyAdmin,async(req,res)=>{
  const id=req.params.id
  const query={_id:new ObjectId(id)}
  const result = await assetsCollection.deleteOne(query)
  res.send(result)
})

app.delete('/requestDelete/:id',verifyToken,async(req,res)=>{
  const id = req.params.id
  const query={_id : new ObjectId(id)}
  const result = await requestCollection.deleteOne(query)
  res.send(result)
})

app.patch('/employeeDelete/:id',verifyToken,verifyAdmin,async(req,res)=>{
const id=req.params.id
const query={_id :new ObjectId(id)}
const emailQuery=req.body.emailQuery
const emailHr={email : emailQuery}
const updatedDoc={
  $inc:{addMember : +1,employeeMember : - 1}
}
const result2 = await userCollection.updateOne(emailHr,updatedDoc)

const updatedDoc2={
  $set :{HrEmail:"" ,role:"user"}
}
const result = await userCollection.updateOne(query,updatedDoc2)
res.send(result)

})
app.patch('/requestReturn/:id',verifyToken,async(req,res)=>{
const id=req.params.id
const query={_id :new ObjectId(id)}
const updatedDoc2={
  $inc :{productQuantity: + 1}
}
const query2={itemId:id}
const updated={
  $set:{request : "returned"}
}
const result = await assetsCollection.updateOne(query,updatedDoc2)
const result2 = await requestCollection.updateOne(query2,updated)
res.send(result)

})

   
  } finally {

  }
}
run().catch(console.dir);


app.get('/' , (req , res)=>{
    res.send('server is running')
})

app.listen(port,()=>{
    console.log(`server is running on port : ${port}`)
})