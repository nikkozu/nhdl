const express = require("express");
const request = require("request");
const path = require("path");
const archiver = require("archiver");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/download/nhentai/:code/zip", async function(req, res, next) {
  let code = req.params.code;
  let api = await getGalleryData(code);

  var start = 0;
  var end = api.num_pages;
  if (!Number.isInteger(start));
  if (!Number.isInteger(end));
  if (start > end) end = start;
  res.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-disposition": `attachment; filename=${code}.zip`
  });
  var zip = archiver("zip", {
    store: true
  });
  zip.pipe(res);
  var now = start;
  var finish = end - start + 1;
  while (now <= end) {
    download_photo(
      `https://i.nhentai.net/galleries/${api.media_id}/${now}.`,
      now,
      0,
      function(url, name, type, cnt) {
        if (cnt <= 4) {
          var stream = request(url + type);
          zip.append(stream, {
            name: path.join(`${api.title.pretty}(${code})`, `${name}.${type}`)
          });
        }
        if (--finish === 0) zip.finalize();
      }
    );
    now++;
    await sleep(100);
  }
});

app.get("/download/nhentai/:code/cbz", async function(req, res, next) {
  let code = req.params.code;
  let api = await getGalleryData(code);

  var start = 0;
  var end = api.num_pages;
  if (!Number.isInteger(start));
  if (!Number.isInteger(end));
  if (start > end) end = start;
  res.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-disposition": `attachment; filename=${code}.cbz`
  });
  var zip = archiver("zip", {
    store: true
  });
  zip.pipe(res);
  var now = start;
  var finish = end - start + 1;
  while (now <= end) {
    download_photo(
      `https://i.nhentai.net/galleries/${api.media_id}/${now}.`,
      now,
      0,
      function(url, name, type, cnt) {
        if (cnt <= 4) {
          var stream = request(url + type);
          zip.append(stream, {
            name: path.join(`${api.title.pretty}(${code})`, `${name}.${type}`)
          });
        }
        if (--finish === 0) zip.finalize();
      }
    );
    now++;
    await sleep(100);
  }
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

async function getGalleryData(code) {
  let api = {};
  try {
    let json = await axios.get(`https://nhentai.net/api/gallery/${code}`);
    api = json.data;
  } catch (e) {
    api = {
      error: true,
      message: "Gallery doesn't exist!"
    };
  }
  return api;
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function download_photo(url, filename, cnt, callback) {
  if (cnt > 4) {
    callback(0, 0, 0, cnt);
    return;
  }
  if (cnt > 0) await sleep(200);
  url_exist(url + "jpg", function(exist) {
    if (exist) callback(url, filename, "jpg", cnt);
    else {
      url_exist(url + "png", function(exist) {
        if (exist) callback(url, filename, "png", cnt);
        else {
          download_photo(url, filename, cnt + 1, callback);
        }
      });
    }
  });
}

function url_exist(url, callback) {
  var options = {
    method: "HEAD",
    url: url
  };
  request(options, function(err, resp, body) {
    if (err) console.log(err);
    //Hook.err("Logs", err);
    callback(!err && resp.statusCode == 200);
  });
}

let UserAgent =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36";

function get_page(url, csrftoken, sessionid, callback) {
  if (csrftoken !== 0)
    var headers = {
      "User-Agent": UserAgent,
      Cookie: `csrftoken=${csrftoken}; sessionid=${sessionid}`
    };
  else var headers = { "User-Agent": UserAgent };
  request({ url: url, headers: headers }, callback);
}

function add_string(text, keyword, add) {
  var index = text.indexOf(keyword);
  if (index === -1) {
    return text;
  } else index += keyword.length;
  return text.slice(0, index) + add + text.slice(index);
}

function process_html(body) {
  let keyword = '><i class="fa fa-tachometer"></i> ';
  var index = body.indexOf(keyword) + keyword.length;
  var username = "";
  var image = "";
  while (body[index] !== "<") username += body[index++];
  console.log(username);
  body = body.replace(
    /<button class="btn btn-primary btn-thin remove-button" type="button"><i class="fa fa-minus"><\/i>&nbsp;<span class="text">Remove<\/span><\/button>/g,
    ""
  );
  body = body.replace(
    /<a href=\"\/users\/.*fa fa-tachometer.*<\/a><\/li><li>/g,
    '<i class="fa fa-tachometer"></i> ' + username + "</li><li>"
  );
  body = body.replace(/<ul class=\"menu left\">.*Info<\/a><\/li><\/ul>/, "");
  body = body.replace(
    /<a href="\/favorites\/random".*class="fa fa-random fa-lg"><\/i><\/a>/,
    ""
  );
  body = add_string(
    body,
    "<head>",
    '<meta name="referrer" content="no-referrer">'
  );
  return body;
}
