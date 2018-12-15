var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI);

// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://flipboard.com/@news/the-daily-edition-3adc9613z").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
    var result = {};
    // Now, we grab every h2 within an article tag, and do the following:
    $(".package-post__title").each(function(i, element) {
      // Add the text of every article, and save them as properties of the result object
      result.headline = $(this)
        .children("a")
        .children("h1")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");
      result.summary = "NA"

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  db.Article.find({}).then(function(results) {
    res.send(results);
  })
  .catch(function(err){
    res.json(err);
  })
});

app.get("/articles/saved", function(req, res) {
  db.Article.find({saved: true}).then(function(results) {
    res.send(results);
  })
  .catch(function(err){
    res.json(err);
  })
});

app.get("/saved", function(req, res) {
  res.sendFile(__dirname + "/public/saved.html");
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // TODO
  // ====
  // Finish the route so it finds one article using the req.params.id,
  db.Article.findOne({_id: req.params.id})
  .populate("comment")
  .then(function(oneArticle) {
    res.json(oneArticle)
  })
  .catch(function(err){
    res.json(err);
  });
  // and run the populate method with "note",
  // then responds with the article with the note included
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // TODO
  // ====
  // save the new note that gets posted to the Notes collection

  db.Comment.create(req.body)
  .then(function(resultComment){
    return db.Article.findOneByIdAndUPdate(req.params.id, { comment: resultComment.id }, { new: true });
  })
  .then(function(ArticleWComment){
    res.json(ArticleWComment);
  })
  .catch(function(err){
    res.json(err);
  })
});

app.put("/articles/save/:id", function(req, res){
  db.Article.findByIdAndUpdate(req.params.id, {saved: true}, (err) => {
    if (err) res.send(err);
    return res.send("Article Saved!");
  });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
