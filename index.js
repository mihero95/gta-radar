
// gta_deals.js
// npm i express axios cheerio

import express from "express";
import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";

const app = express();
const PORT = 3000;
const DATA_FILE = "./cache.json";

// ---------- SCRAPER ----------
async function fetchAll() {
  const url = "https://www.rockstargames.com/gta-online";
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const items = [];
  const activities = [];

  $("article").each((i, el) => {
    const title = $(el).find("h3").text().trim();
    const text = $(el).text().toLowerCase();

    if (!title) return;

    // Shop deals
    if (text.includes("%") || text.includes("free")) {
      items.push({
        name: title,
        desc: $(el).text().trim(),
        free: text.includes("free"),
        type: "item"
      });
    }

    // Bonus activities
    if (
      text.includes("2x") ||
      text.includes("3x") ||
      text.includes("double") ||
      text.includes("triple")
    ) {
      activities.push({
        name: title,
        desc: $(el).text().trim(),
        multiplier:
          text.includes("3x") || text.includes("triple")
            ? "x3"
            : "x2",
        type: "activity"
      });
    }
  });

  return { items, activities, updated: new Date().toISOString() };
}

// ---------- CHANGE DETECTOR ----------
function hasChanged(newData) {
  if (!fs.existsSync(DATA_FILE)) return true;
  const oldData = JSON.parse(fs.readFileSync(DATA_FILE));
  return JSON.stringify(oldData) !== JSON.stringify(newData);
}

// ---------- HTML ----------
function renderHTML(data) {
return `
<!DOCTYPE html>
<html>
<head>
<title>GTA Deals Tracker</title>
<style>
body { font-family: Arial; background:#111; color:white; }
h2 { color:#0f0; }
.card { border:1px solid #333; padding:10px; margin:10px; }
.free { color:lime; }
.x2 { color:cyan; }
.x3 { color:orange; }
button { margin:5px; }
</style>
</head>
<body>

<h1 id="title">GTA Deals</h1>
<p>Last update: ${data.updated}</p>

<button onclick="show('all')">Tout</button>
<button onclick="show('free')">Gratuits</button>
<button onclick="show('activities')">x2 / x3</button>
<button onclick="show('fav')">Favoris</button>

<button onclick="setLang('fr')">FR</button>
<button onclick="setLang('en')">EN</button>

<h2>Shop</h2>
<div id="items"></div>

<h2>Bonus Activities</h2>
<div id="activities"></div>

<script>
let DATA = ${JSON.stringify(data)};
let favs = JSON.parse(localStorage.getItem("favs") || "[]");
let lang = localStorage.getItem("lang") || "fr";

const t = {
 fr: { title:"Promos GTA", free:"Gratuit", bonus:"Bonus" },
 en: { title:"GTA Deals", free:"Free", bonus:"Bonus" }
};

function setLang(l){
 lang=l;
 localStorage.setItem("lang",l);
 render(DATA.items, DATA.activities);
}

function toggleFav(name){
 favs.includes(name)
  ? favs = favs.filter(f=>f!==name)
  : favs.push(name);
 localStorage.setItem("favs",JSON.stringify(favs));
 render(DATA.items, DATA.activities);
}

function show(type){
 let items = DATA.items;
 let acts = DATA.activities;

 if(type==="free") items = items.filter(i=>i.free);
 if(type==="fav"){
   items = items.filter(i=>favs.includes(i.name));
   acts = acts.filter(a=>favs.includes(a.name));
 }
 if(type==="activities") items = [];

 render(items, acts);
}

function render(items, acts){
 document.getElementById("title").innerText = t[lang].title;

 document.getElementById("items").innerHTML =
 items.map(i=>\`
 <div class="card">
  <b>\${i.name}</b>
  <p class="\${i.free?"free":""}">\${i.desc}</p>
  <button onclick="toggleFav('\${i.name}')">
   \${favs.includes(i.name)?"⭐":"☆"}
  </button>
 </div>\`).join("");

 document.getElementById("activities").innerHTML =
 acts.map(a=>\`
 <div class="card">
  <b>\${a.name}</b>
  <p class="\${a.multiplier}">
   \${a.multiplier} GTA$ & RP<br>
   \${a.desc}
  </p>
  <button onclick="toggleFav('\${a.name}')">
   \${favs.includes(a.name)?"⭐":"☆"}
  </button>
 </div>\`).join("");
}

render(DATA.items, DATA.activities);

// Notification si changement
if(Notification.permission !== "granted"){
 Notification.requestPermission();
}
</script>
</body>
</html>
`;
}

// ---------- SERVER ----------
app.get("/", async (req, res) => {
  const data = await fetchAll();

  if (hasChanged(data)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log("New GTA bonuses detected!");
  }

  res.send(renderHTML(data));
});

app.listen(PORT, () => {
  console.log("GTA Deals running on http://localhost:" + PORT);
});
