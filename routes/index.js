var express = require('express');
var router = express.Router();
const upload = require("./multer")

const userModel = require("./users")
const postModel = require("./post")
const passport = require("passport")
const localStrategy = require("passport-local")
passport.use(new localStrategy(userModel.authenticate()));

// register route
router.get('/', function(req, res, next) {
  res.render('index');
});

// login route 
router.get('/login', function(req, res, next) {
  res.render('login');
});

//like route
router.get("/like/post/:id", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({username: req.session.passport.user});
  const post = await postModel.findOne({_id: req.params.id});

  if(post.likes.indexOf(user._id) === -1) {
    post.likes.push(user._id);
  } else {
    post.likes.splice(post.likes.indexOf(user._id), 1)
  }
  await post.save()
  res.redirect("/home")
});

// home route 
router.get('/home', isLoggedIn, async function(req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user})
  const posts = await postModel.find().populate("user")
  res.render("home", {posts, user})
});

// post route 
router.get('/post', isLoggedIn, function(req, res, next) {
  res.render('post');
});

// search route
router.get('/search', isLoggedIn, function(req, res) {
  res.render('search', {footer: true});
});

router.get("/username/:username", isLoggedIn, async function(req, res) {
  const regex   = new RegExp(`^${req.params.username}`, "i");
  const users  = await userModel.find({username: regex});
  res.json(users);
})

// profile route 
router.get('/profile', isLoggedIn, async function(req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user}).populate("posts")
    console.log(user);
  res.render('profile', {user});
});

// edit route 
router.get('/edit', isLoggedIn, async function(req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user});
  res.render("edit", {user});
});

// logout 
router.get('/logout', function(req, res) {
  req.logout(function(err) {
    if(err) {return next(err);}
    res.redirect("/");
  })
});

// router.post 
// for registering and logging users
router.post("/register", function(req, res) {
  const userData = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
    // secret: req.body.secret
  })

  userModel.register(userData, req.body.password)
  .then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    })
  })
})

router.post('/login', passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/login"
}), function (req, res) {
})

// edit profile 
router.post("/update", upload.single("image"), async function(req, res) {
  const user = await userModel.findOneAndUpdate(
    {username: req.session.passport.user},
    {username: req.body.username, name: req.body.name, bio: req.body.bio},
    { new: true }
  )
  if(req.file) {
    user.profileImage = req.file.filename;
  }
  await user.save();
  res.redirect("/profile");
})

// upload post
router.post("/upload", isLoggedIn, upload.single("image"), async function (req, res) {
  const user = await userModel.findOne({username: req.session.passport.user});
  const post = postModel.create({
    picture: req.file.filename,
    user: user._id,
    caption: req.body.caption
  })
  user.posts.push(post._id);
  await user.save();
  res.redirect("/home")
}) 

// loggedin function 
function isLoggedIn(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}
module.exports = router;
