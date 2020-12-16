    //jshint esversion:6


    require('dotenv').config({path: '.env'});
    
    const express = require("express");
    const bodyParser = require("body-parser");
    const ejs = require("ejs");
    const mongoose = require("mongoose");
    const session = require('express-session');
    const jwt = require("passport-jwt");
    const passport = require('passport');
    const passportLocalMongoose = require('passport-local-mongoose');

    const app = express();


    app.use(express.static("public"));
    app.set('view engine', 'ejs');
    app.use(bodyParser.urlencoded({extended: true}));

    //CALLING SESSION
    app.use(session({
      secret: 'This is my very own secret',
      resave: false,
      saveUninitialized: false
    }));


    //PASSPORT
    app.use(passport.initialize());
    app.use(passport.session());


    const signToken = userID => {
        return jwt.sign({
            iss: "AppFactory",
            sub: userID
        }, "AppFactory", {expiresIn: "1h"});
    }

    const cookieExtractor = req => {
        let token = null;
        if(req && req.cookies){
            token = req.cookies["access_token"];
        }
        return token;
    };



    // //authorizaion
    // passport.use(new jwt({
    //     jwtFromRequest: cookieExtractor,
    //     secretOrKey: "MySecret"
    // }, (payload, done) => {
    //     User.findById({_id: payload.sub}, (err, user) => {
    //         if(err)
    //             return done(err, false);
    //         if(user)
    //             return done(null, user);
    //         else
    //             return done(null, false);
    //     });
    // }));



    // authenticated local strategy using email and password
    // passport.use(new LocalStrategy((email, password, done) => {
    //     User.findOne({email}, (err, user) => {
    //         ///////if something happens
    //         if(err)
    //             return done(err);
    //         /////if no user exist
    //         if(!user)
    //             return done(null, false);
    //         ////check if password is correct
    //         user.comparePassword(password, done);
    //     });
    // }));



    //setup mongoose  process.env.MONGODB_CONNECTION_STRING
    mongoose.connect("mongodb://localhost:27017/internnodeDB", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
    }, (err) => {
        if(err) throw err;
        console.log("mongoDB connection established");
    });

    //schema
    const userSchema = new mongoose.Schema({    //Schema is from mongoose. mongoose.Schema is introduced due to encryption
      email: {
          type: String
        },
      password: {
          type: String,
          minlength: 6
      }
    });


    //PLUGINs
    userSchema.plugin(passportLocalMongoose);      //FOR THE HASHING AND CRYPTING




    //model
    const User = new mongoose.model("User", userSchema);

    passport.use(User.createStrategy());


    //This serialization of session works for all OAuth.
    passport.serializeUser(function(user, done) {
        done(null, user.id);
      });

      passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
          done(err, user);
        });
      });



    app.get("/", function(req, res){
      res.render("home");
    });

    app.get("/login", function(req, res){
      res.render("login");
    });

    app.get("/register", function(req, res){
      res.render("register");
    });


    app.get("/secrets", function (req, res) {
      User.find({"secret": {$ne: null}}, function(err, foundUser) {  //$ne means value($) not(n) equal(e) to
        if(err){
          console.log(err);
          res.render("login")
        } else {
          if(foundUser){
            res.render("secrets", {usersWithSecrets: foundUser});
          }
        }
      });
    });

    app.route("/submit")
    .get(function(req, res){
      if (req.isAuthenticated()){
        res.render("submit");
      } else{
        res.redirect("/login");
      }
    })

    .post(function(req, res){
        const submittedSecret = req.body.secret;
        console.log(req.user.id);

        User.findById(req.user.id, function(err, foundUser) {
          if(err){
            console.log(err);
          } else {
            if (foundUser) {
              foundUser.secret = submittedSecret;
              foundUser.save(function() {
                res.redirect("/secrets");
              });
            }
          }
        });

    });


    app.get("/logout", function(req, res){
      req.logOut();
     res.redirect("/");
    });


    app.post("/register", function(req, res){
      User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function() {
            res.redirect("/secrets");
          });
        }
      });
    });

    app.route("/login")
      .get(function (req, res) {
          res.render('login');
    })
      .post(function (req, res) {
        passport.authenticate('local', {successRedirect: '/secrets', failureRedirect: '/login',})(req, res);
    });






////SERVER
let PORT = process.env.PORT || 5000;
if (PORT == null || PORT == ""){
    PORT = 5000;
}
app.listen(PORT, () => console.log('The server has started on port: 5000'));
