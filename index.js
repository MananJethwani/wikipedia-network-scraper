var axios = require("axios");
var DomParser = require("dom-parser");
var createCsvWriter = require("csv-writer").createObjectCsvWriter;
var parser = new DomParser();
var { sleep, isValidHttpUrl } = require("./utils");
var csvWriter = createCsvWriter({
  path: "./graph3.csv",
  header: [
    { id: "node_from", title: "Node From" },
    { id: "node_to", title: "Node To" },
  ],
});

// constant declaration
const articlePath = "page/mobile-sections/";
const querString =
  "action=query&format=json&prop=redirects%7Crevisions%7Ccoordinates&rdlimit=max&rdnamespace=0&colimit=max&rawcontinue=true&generator=allpages&gapfilterredir=nonredirects&gaplimit=max&gapnamespace=0&gapcontinue=";
const titleMap = new Map();

// retreiving arguments
const argv = require("argv");
const args = argv
  .option([
    {
      name: "URI",
      short: "u",
      type: "string",
      description: "URL for wikipedia to scrape from",
      example: "'npm run scrape -- --URI=value' or 'npm run scrape -u value'",
    },
    {
      name: "articleList",
      short: "a",
      type: "string",
      description: "Article List to scrape",
      example:
        "'npm run scrape -- --articleList=value' or 'npm run scrape -a value'",
    },
  ])
  .run();
const { URI: baseUri, articleList } = args.options;

// creating base links for fetching
let restApiUrl = `${baseUri}/api/rest_v1/`;
let apiUrl = `${baseUri}/w/api.php?`;
let edges = [];
let titleList = [];

let appendArticleList = async (url, gapValue) => {
  try {
    sleep(30);
    const { data } = await axios.get(encodeURI(url + gapValue));
    if (data && data.query && data.query.pages) {
      Object.keys(data.query.pages).forEach(function (key) {
        if (data.query.pages[key].title) {
          titleList.push(data.query.pages[key].title);
        }
      });
      return (
        (data && data["query-continue"] && data["query-continue"].allpages &&
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
    titles.push(title.substring(6));
  });
  return titles;
};

async function Dfs(title) {
  try {
    sleep(30);
    const { data } = await axios.get(
      encodeURI(restApiUrl + articlePath + title)
    );
    if (!data) throw new Error("No data");
    let titles = [];
    var { sections } = data["lead"] || [];
    for (let index in sections) {
      if (sections[index].text !== undefined) {
        titles = titles.concat(contentParser(sections[index].text));
      }
    }
    var { sections } = data["remaining"] || [];
    for (let index in sections) {
      if (sections[index].text !== undefined) {
        titles = titles.concat(contentParser(sections[index].text));
      }
    }

    for (let index in titles) {
      if (titleMap.get(titles[index]) !== undefined) {
        csvWriter.writeRecords([{ node_from: title, node_to: titles[index] }]).then(() => {});
      }
      if (titleMap.get(titles[index]) !== undefined && titleMap.get(titles[index]) === 0) {
        titleMap.set(titles[index], 1);
        await Dfs(titles[index]);
      }
    }
  } catch (err) {
    console.log(err);
  }
}

let scrapeArticleList = async (articleList) => {
  if (articleList === undefined) {
    var gapValue = "";
    do {
      gapValue = await appendArticleList(apiUrl + querString, gapValue);
    } while (gapValue != "");
  } else {
    if (isValidHttpUrl(articleList)) {
      const { data } = await axios.get(articleList);
      titleList = data.split("\n");
    } else {
      const data = fs.readFileSync(articleList, {
        encoding: "utf8",
        flag: "r",
      });
      titleList = data.split("\n");
    }
  }
}

let scrapeEdges = async () => {
  for (let index in titleList) {
    console.log(index);
    if (titleMap.get(titleList[index])) continue;
    titleMap.set(titleList[index], 1);
    await Dfs(titleList[index]);
  }
}

let scrape = async () => {
  console.log("statring scraping");
  await scrapeArticleList(articleList);
  console.log("article list scarpped");
  titleList.forEach((title) => {
    titleMap.set(title, 0);
  })
  console.log("title list set");
  await scrapeEdges();
  console.log("edges scarpped");
  // csvWriter.writeRecords(edges).then(() => {
  //   console.log("Saved Edges");
  // });
};

scrape();
