const fs  = require('fs/promises');
const path = require('path');


const express = require('express');
const app = express();
const port = 3000;
const filepath = path.join(__dirname, "db.json");

async function readfile(){

   let getdata =  await fs.readFile(filepath,"utf-8")
   return JSON.parse(getdata)
}
async function setfuntion(){
    let key = req.url;
    let value = 
    await new Promise((resolve,reject)=>{
    setTimeout(resolve, 1500);}
    )
    return await readfile();
}
app.get('/', async (req, res) => {
    // let id = Number(req.params.id);

try{
    let data = await setfuntion();
    // let result = data.find((item)=>
        // item.id === id)
        
    
    res.json(data);
}
catch(err){
    console.log(err);
}
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});