var axios = require("axios");
var DomParser = require("dom-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
var parser = new DomParser();
const csvWriter = createCsvWriter({
  path: "/home/manan/Desktop/graph2.csv",
  header: [
    { id: "node_from", title: "Node From" },
    { id: "node_to", title: "Node To" },
  ],
});

let restApiUrl = "https://en.wikipedia.org/api/rest_v1/";
let articlePath = "page/mobile-sections/";
let apiUrl = "https://en.wikipedia.org/w/api.php?";
let querString =
  "action=query&format=json&prop=redirects%7Crevisions%7Ccoordinates&rdlimit=max&rdnamespace=0&colimit=max&rawcontinue=true&generator=allpages&gapfilterredir=nonredirects&gaplimit=max&gapnamespace=0&gapcontinue=";
const map1 = new Map();
let edges = [];
let titleList = [];

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

let appendArticleList = async (url, gapValue) => {
  try {
    sleep(25);
    const { data } = await axios.get(encodeURI(url + gapValue));
    if (data.query !== undefined && data.query.pages !== undefined) {
      Object.keys(data.query.pages).forEach(function (key) {
        if (data.query.pages[key].title !== undefined) {
          map1.set(data.query.pages[key].title, 0);
          titleList = [...titleList, data.query.pages[key].title];
        }
      });
      return (
        (data["query-continue"] &&
          data["query-continue"].allpages.gapcontinue) ||
        ""
      );
    }
  } catch (err) {
    console.log(err);
  }
};

contentParser = (html) => {
  const content = parser.parseFromString(html);
  let titles = [];
  content.getElementsByTagName("a").forEach(function (element) {
    const title = element.getAttribute("href");
    if (title === undefined || title === null) return;
    if (title.substring(0, 6) !== "/wiki/") return;
    titles = [...titles, title.substring(6)];
  });
  return titles;
};

async function Dfs(title) {
  try {
    sleep(25);
    const { data } = await axios.get(
      encodeURI(restApiUrl + articlePath + title)
    );
    let titles = [];
    var { sections } = data["lead"];
    for (let index in sections) {
      if (sections[index].text !== undefined) {
        titles = [...titles, ...contentParser(sections[index].text)];
      }
    }
    var { sections } = data["remaining"];
    for (let index in sections) {
      if (sections[index].text !== undefined) {
        titles = [...titles, ...contentParser(sections[index].text)];
      }
    }
    for (let index in titles) {
      if (map1.get(titles[index]) === 0) {
        map1.set(titles[index], 1);
        edges = [...edges, { node_from: title, node_to: titles[index] }];
        await Dfs(titles[index]);
      }
    }
  } catch (err) {
    console.log(err);
  }
}

let scrapeArticleList = async () => {
  var gapValue = "";
  do {
    gapValue = await appendArticleList(apiUrl + querString, gapValue);
  } while (gapValue != "");
  console.log("here");
  for (let index in titleList) {
    console.log(index);
    if (map1.get(titleList[index]) === 1) continue;
    map1.set(titleList[index], 1);
    await Dfs(titleList[index]);
  }

  csvWriter.writeRecords(edges).then(() => {
    console.log("...Done");
  });
};

scrapeArticleList();
