import express from "express"
import path from "path"
import env from "dotenv"
import cookieParser from "cookie-parser";
import cors from "cors"
import bodyParser from "body-parser"
import jwt from "jsonwebtoken"

import mongoose from "mongoose";
import axios from "axios";
env.config();
mongoose.connect(process.env.MONGO_URI, {
    dbName: "WheatherApp"
}).then((e) => console.log("Connected")).catch((e) => console.log(e))

const userSchema = mongoose.Schema({
    name: String, email: String, password: String, history: []
})

const User = mongoose.model("User", userSchema)



const app = express();
const port = 3000;

app.set("view engine", "ejs")


// uisng middleware here
app.use(express.static(path.join(path.resolve(), 'public')))  // to make public directory in current folder
app.use(express.urlencoded({ extended: true }));  // used to allow read body data comes in req from frontEnd
app.use(cookieParser())
app.use(cors())
app.use(bodyParser.json());




app.get("/", (req, res) => {
    // console.log(req.cookies.token);
    console.log(req.query);
    const { token } = req.cookies;
    if (token) {
        res.render("logout",)
    } else {
        res.redirect("register")
    }
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.get("/register", (req, res) => {
    res.render("register")
})
// app.get("/history",(req,res)=>{
//     res.send("this is your history search")
// })

app.post("/login", async (req, res) => {
    //look in database for user is exist or not
    const user = await User.findOne({ email: req.body.email })
    // const secretKey = 'your_secret_key'; // Replace with your secret key
    const payload = { user: user.email }
    // console.log(user);
    const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '5h' });

    // console.log(token);

    if (!user) {
        console.log("Already Exist");
        res.redirect("register")
    } else {
        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 30000 * 1000)
        });
        res.redirect("/")
    }
    // return res.send("sdfd")
    // if exist then redirect to logout page or render logout page
    // if not exist then redirect to register
})

app.post("/register", async (req, res) => {
    //here look in database then do some operation
    // console.log(req.body);
    const user = await User.findOne({ email: req.body.email })
    if (user) {
        console.log("Already Exist");
    } else {
        await User.create(req.body)
    }
    res.redirect("/login")
})

app.post("/logout", (req, res) => {
    // here logout the use and redirect to login page
    res.cookie("token", null, {
        expires: new Date(Date.now())
    });
    res.redirect("/login")

})

app.post("/history", async (req, res) => {
    // console.log(req.cookies.token);
    const token = req.cookies.token;
    // console.log(token);
    let email;
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err.message);
        } else {
            // console.log('Token decoded:', );
            email = decoded.user
        }
    });
    const user = await User.findOne({ email: email })
    // console.log(user);


    res.json({ data: user.history })
})

app.delete("/delete", async (req, res) => {
    const { index } = req.body;
    console.log(index);
    const token = req.cookies.token;
    console.log(token);
    let email;
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err.message);
        } else {
            // console.log('Token decoded:', );
            email = decoded.user
        }
    });


//    await User.updateOne(
//     { email: email }, // Match document by _id
//     { $pull: { "history": null } } // Pull null values from the arrayField array
//   );


    const data = await User.findOne({ email: email })
    // console.log(data.history.length);
    let idx = data.history.length - index;
    // console.log(data.history);
    let updatehistroy=data.history.filter((el,index)=>idx!==index);
    // console.log(updatehistroy);
    // console.log(email);
    await User.updateOne(
        { email: email }, // Match document by _id
        { $set: { "history": updatehistroy } } // Set the arrayField to the new array
      );
    // await User.updateOne(
    //     { email: email }, // Match document by _id
    //     [
    //         {
    //             $set: {
    //                 [`history.${idx}`]: null // Set the element at the specified index to null
    //             }
    //         },
    //         {
    //             $pull: {
    //                 "history": null // Pull null values from the arrayField array
    //             }
    //         }
    //     ]
    // );
    const user=await User.findOne({email:email});
    console.log(user);
    res.json({ data: user.history })
})

app.post("/fetchData", async (req, res) => {
    const { city } = req.body;
    const token = req.cookies.token;
    let email;
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err.message);
        } else {
            // console.log('Token decoded:', );
            email = decoded.user
        }
    });
    // const user = await User.findOne({  })

    try {
        // Update the user document by pushing the new hobby to the hobbies array
        const result = await User.updateOne(
            { email: email }, // Filter for the user document
            { $push: { history: { city: city, time: Date() } } } // Add the new hobby to the hobbies array
        );
        console.log('Hobby added successfully:', result);
    } catch (err) {
        console.error('Error adding hobby:', err);
    }
    const url = `http://api.openweathermap.org/data/2.5/weather?appid=${process.env.API_KEY}&q=${city}`
    const data = await axios.get(url);
    const iconCode = data.data.weather[0].icon;
    const iconUrl = `http://openweathermap.org/img/w/${iconCode}.png`;
    const main = data.data.weather[0].main
    const des = data.data.weather[0].description
    const temp = data.data.main.temp;
    const humidity = data.data.main.humidity
    const obj = { iconUrl: iconUrl, main: main, des: des, temp: temp, humidity: humidity }
    // console.log(obj);
    // console.log(data.data.main.humidity); 
    res.json(obj)

})

app.listen(3000, () => {
    console.log("running on 3000");
})