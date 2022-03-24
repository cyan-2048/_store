let versions, error_happened;
const fs = require("fs"),
	fetch = require("node-fetch"),
	chalk = require("chalk"),
	AdmZip = require("adm-zip"),
	aleCache = {},
	suborgCache = {};
updated = [];
const getFiles = (source) => {
	return fs
		.readdirSync(source, { withFileTypes: true })
		.filter((dirent) => !dirent.isDirectory())
		.map((dirent) => dirent.name);
};
console.error = (e) => {
	try {
		process.stdout.write("\x07");
	} catch (err) {
		console.log("\x07");
	}
	error_happened = true;
	console.log(chalk.white.bgRed(e));
};
let tries = 0;

(function testInternt() {
	require("dns").resolve("www.google.com", (err) => {
		if (err && tries < 10) {
			tries++;
			console.error("Internet not working trying again...");
			setTimeout(testInternt, (tries / 2) * 5000);
		} else if (tries == 10) {
			console.error("No connection");
			throw "yeah";
		} else {
			tries = 0;
			if (!getFiles("./").includes("automate.js")) {
				console.error("RUN THE SCRIPT INSIDE THE NODE FOLDER");
			} else {
				fs.readFile("./versions.json", "utf8", function (err, data) {
					if (err) throw err;
					else {
						versions = JSON.parse(data);
						init();
					}
				});
			}
		}
	});
})();

console.green = (e) => {
	console.log(chalk.black.bgGreenBright(e));
};

function init() {
	let pa = "./cache/";
	try {
		fs.mkdirSync(pa);
	} catch (e) {
		fs.rmSync(pa, { recursive: true, force: true });
		fs.mkdirSync(pa);
	}
	function commit() {
		if (updated.length != 0) {
			var shell = require("shelljs");
			console.green("running git!");
			shell.exec(`cd .. && git add . && git commit -m "this commit is automated! ${updated.join(", ")}" && git push`);
			console.green("DONE!!!");
			delay();
		} else {
			console.green("\nNo updates!");
			delay();
		}
	}
	App.armaInit(() => App.armaFormat(() => App.suborgInit(() => App.suborgFormat(() => App.aleInit(() => App.aleFormat(() => commit()))))));
}

function delay() {
	fs.rmSync("./cache/", { recursive: true, force: true });
	if (error_happened) throw new EvalError("An error occured please check logs...");
}
let new_versions = [];
const App = (function () {
	let index = 0;
	function initStart(a, c) {
		if (index == 0) {
			new_versions = [];
			let n = a == "arma7x" ? "" : "\n";
			console.log(chalk.black[c](n + `Checking versions of ${a}'s apps...`));
		}
	}
	function upStart(a) {
		if (index == 0) console.log(chalk.white.bgBlue(`\nUpdating ${a}'s apps...`));
	}
	function checkErr(i, h) {
		console.error(`error app check ver: ${i} => ` + h);
	}
	function initApp(a) {
		console.log(`start init: ${a}`);
	}

	function armaInit(cb) {
		initStart("arma7x", "bgYellow");
		const apps = Object.keys(versions.arma7x),
			i = apps[index],
			n = () => {
				index++;
				if (index == apps.length) {
					console.green("Done checking for updates! => " + JSON.stringify(new_versions));
					index = 0;
					if (cb != undefined) cb();
					return;
				} else {
					armaInit(cb);
				}
			};
		getVersion(
			i,
			(v) => {
				const e = v.version;
				if (versions["arma7x"][i] != e) {
					console.log(`new ver: ${i} = ${versions["arma7x"][i]} -> ${e}`);
					new_versions.push(i);
					n();
				} else n();
			},
			(h) => {
				checkErr(i, h);
				n();
			}
		);
	}
	function aleInit(cb) {
		initStart("ale4710", "bgRed");
		const arr = Object.keys(versions.ale4710),
			n = () => {
				if (index == arr.length) {
					console.green("Done checking for updates! =>" + JSON.stringify(new_versions));
					index = 0;
					if (cb != undefined) cb();
				}
			};
		arr.forEach((a) => {
			fetch(`https://alego.web.fc2.com/kaiosapps/${a}/changelog.txt`)
				.then((data) => data.text())
				.then((data) => {
					index++;
					let latest = data.split("\n")[0].split(" ")[0],
						i = versions["ale4710"][a];
					if (latest != i) {
						if (/....-..-../s.test(latest)) {
							console.log(`new ver: ${a} = ${i} -> ${latest}`);
							aleCache[a] = latest;
							new_versions.push(a);
						} else checkErr(a, "err: VERSION NUMBER IS WRONG");
					}
					n();
				})
				.catch((error) => {
					checkErr(a, error);
					index++;
					n();
				});
		});
	}
	function suborgInit(cb) {
		initStart("suborg", "bgGreen");
		const arr = Object.keys(versions.suborg),
			n = () => {
				if (index == arr.length) {
					console.green("Done checking for updates! => " + JSON.stringify(new_versions));
					index = 0;
					if (cb != undefined) cb();
				}
			};
		arr.forEach((a) => {
			let b = a == "crosstweak" ? "main" : "master";
			fetch(`https://gitlab.com/suborg/${a}/-/raw/${b}/manifest.webapp`)
				.then((d) => d.json())
				.then((d) => {
					index++;
					let latest = d.version,
						i = versions["suborg"][a];
					console.log(latest);
					if (i != latest) {
						console.log(`new ver: ${a} = ${i} -> ${latest}`);
						suborgCache[a] = latest;
						new_versions.push(a);
					}
					n();
				})
				.catch((e) => {
					console.error(e);
					n();
				});
		});
	}

	function armaFormat(cb) {
		if (new_versions.length == 0) {
			if (cb) cb();
			return;
		}
		upStart("arma7x");
		let app = new_versions[index],
			i = versions.arma7x_dict[app],
			pa = `./cache/${i}-master/`,
			n = () => {
				index++;
				if (index == new_versions.length) {
					console.green("Done updating arma7x's apps!!!");
					updateVersionFile();
					index = 0;
					if (cb != undefined) cb();
					return;
				} else armaFormat(cb);
			},
			error = (e) => {
				console.error(e);
				n();
			};
		initApp(i);
		downloadFile(`https://github.com/arma7x/${i}/archive/refs/heads/master.zip`, "./cache/master.zip")
			.then(() => {
				unzip(
					() => {
						let found = false,
							prop = false;
						getFiles(pa).forEach((el) => {
							function delAds(a) {
								let d = fs.readFileSync(pa + el, "utf-8"),
									h =
										a === true
											? d.replaceAll("function displayKaiAds()", "function regexVeryDumb()").replaceAll("displayKaiAds();", "")
											: d.replaceAll(`<script src="/kaiads.v5.min.js"></script>`, "");
								fs.writeFileSync(pa + el, h, "utf-8");
								if (a) console.log(`ads removed: ${i}`);
							}
							let del = () => fs.rmSync(pa + el, { recursive: true, force: true });
							if (/zip|application|kaiads|webmanifest|gitignore|README/s.test(el)) del();
							if (/app\.js|index\.html/s.test(el)) {
								if (el == "app.js") found = true;
								delAds(el !== "index.html");
							}
							if (el == "manifest.webapp") prop = true;
						});
						if (i == "kaimusic") {
							let el = pa + "assets/js/app.js",
								d = fs.readFileSync(el, "utf-8");
							fs.writeFileSync(el, d.replaceAll("function displayKaiAds()", "function regexVeryDumb()").replaceAll("displayKaiAds();", ""), "utf-8");
							console.log(`ads removed: ${i}`);
							found = true;
						}
						if (!found) console.error("arma7x's app.js was not found, ads will still be present");
						if (!prop) console.error("manifest.webapp not found!");
						appZip(
							pa,
							() => {
								let ca = "./cache/";
								getFiles(ca).forEach((a) => {
									fs.copyFileSync(ca + a, `../arma7x/${app}/` + a);
									fs.rmSync(ca + a, { recursive: true, force: true });
								});
								getVersion(app, (e) => {
									let v = e.version,
										screenshots = (() => {
											let arr = [];
											for (const key in e.screenshots) {
												arr.push(e.screenshots[key]);
											}
											return arr;
										})();

									updated.push(`${i} = ${versions.arma7x[app]} => ${v}`);
									versions["arma7x"][app] = v;
									generateYML({ name: app, screenshots });
								});
								console.log("done updating: " + i);
								n();
							},
							(e) => error(e),
							"arma7x/" + app
						);
					},
					(e) => error(e)
				);
			})
			.catch((e) => error(e));
	}
	function aleFormat(cb) {
		if (new_versions.length == 0) {
			if (cb) cb();
			return;
		}
		let i = new_versions[index],
			n = () => {
				index++;
				if (index == new_versions.length) {
					console.green("Done updating ale4710's apps!!!");
					updateVersionFile();
					index = 0;
					if (cb != undefined) cb();
					return;
				} else aleFormat(cb);
			},
			error = (e) => {
				console.error(e);
				n();
			},
			url = `https://alego.web.fc2.com/kaiosapps/${i}/`;
		fetch(url)
			.then((d) => d.text())
			.then((d) => {
				let p = d
						.match(/<a[\s]+[^>]+(?:.(?!\<\/a\>))*.<\/a>/gi)
						.find((a) => /source code|application/i.test(a))
						.match(/href="(.*?)"/i)[1],
					last = (a) => a[a.length - 1],
					suf = last(p.split("."));

				let pa = "./cache/temp/";
				try {
					fs.mkdirSync(pa);
				} catch (e) {
					fs.rmSync(pa, { recursive: true, force: true });
					fs.mkdirSync(pa);
				}
				initApp(i);
				downloadFile(url + p, "./cache/master." + suf).then(() => {
					function post() {
						let prop = false;
						getFiles(pa).forEach((el) => {
							if (/kaiad/s.test(el)) fs.rmSync(pa + el, { recursive: true, force: true });
							if (el == "manifest.webapp") prop = true;
						});
						if (!prop) console.error("manifest.webapp not found!");
						appZip(
							pa,
							() => {
								let ca = "./cache/";
								getFiles(ca).forEach((a) => {
									fs.copyFileSync(ca + a, `../ale4710/${i}/` + a);
									fs.rmSync(ca + a, { recursive: true, force: true });
								});
								updated.push(`${i} = ${versions.ale4710[i]} => ${aleCache[i]}`);
								versions.ale4710[i] = aleCache[i];
								console.log("done updating: " + i);
								n();
							},
							(e) => error(e),
							"ale4710/" + i
						);
					}
					if (suf == "zip") {
						unzip(post, (e) => error(e), pa);
					} else if (suf == "7z") {
						un7z(post, (e) => error(e));
					} else error("suffix not 7z or zip hmmm");
				});
			})
			.catch((e) => error(e));
	}
	function suborgFormat(cb) {
		if (new_versions.length == 0) {
			if (cb) cb();
			return;
		}
		let i = new_versions[index],
			b = i == "crosstweak" ? "main" : "master",
			pa = `./cache/${i}-${b}/`,
			n = () => {
				index++;
				if (index == new_versions.length) {
					console.green("Done updating suborg's apps!!!");
					updateVersionFile();
					index = 0;
					if (cb != undefined) cb();
					return;
				} else suborgFormat(cb);
			},
			error = (e) => {
				console.error(e);
				n();
			};
		initApp(i);
		downloadFile(`https://gitlab.com/suborg/${i}/-/archive/${b}/${i}-${b}.zip`, "./cache/master.zip")
			.then(() => {
				unzip(
					() => {
						let prop = false;
						getFiles(pa).forEach((el) => {
							let del = () => fs.rmSync(pa + el, { recursive: true, force: true });
							if (/zip|application|\.sh|webmanifest|gitignore|README/s.test(el)) del();
							if (el == "manifest.webapp") prop = true;
						});
						if (!prop) console.error("manifest.webapp not found!");
						appZip(
							pa,
							() => {
								let ca = "./cache/";
								getFiles(ca).forEach((a) => {
									fs.copyFileSync(ca + a, `../suborg/${i}/` + a);
									fs.rmSync(ca + a, { recursive: true, force: true });
								});
								updated.push(`${i} = ${versions.suborg[i]} => ${suborgCache[i]}`);
								versions.suborg[i] = suborgCache[i];
								console.log("done updating: " + i);
								n();
							},
							(e) => error(e),
							"suborg/" + i
						);
					},
					(e) => error(e)
				);
			})
			.catch((e) => error(e));
	}
	return {
		armaInit,
		armaFormat,
		suborgInit,
		suborgFormat,
		aleInit,
		aleFormat,
	};
})();

const getDirectories = (source) => {
	return fs
		.readdirSync(source, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name);
};

const unzip = (cb, ecb, cpa) => {
	// the zip will always be master
	let pa = "./cache/master.zip",
		ca = "./cache/";
	if (cpa) ca = cpa;
	try {
		var zip = new AdmZip(pa);
		zip.extractAllTo(ca, true);
		fs.rmSync(pa, { recursive: true, force: true });
		zip = null;
	} catch (err) {
		if (ecb != undefined) ecb(err);
		return;
	}
	if (cb != undefined) cb();
};

const un7z = (cb, ecb, cpa) => {
	const _7z = require("7zip-min");
	let pa = "./cache/temp/";
	if (cpa) pa = cpa;
	_7z.unpack("./cache/master.7z", pa, (err) => {
		if (err != null) ecb(err);
		else cb();
	});
};

const appZip = (pa, cb, ecb, url) => {
	function genURL(u) {
		let a = url.split("/");
		a[1] = encodeURIComponent(a[1]);
		return `https://raw.githubusercontent.com/cyan-2048/_store/main/${a.join("/")}/manifest.webapp`;
	}
	try {
		var appl = new AdmZip();
		appl.addLocalFolder(pa);
		var buffer = appl.toBuffer();
		var appl = new AdmZip();
		appl.addFile("application.zip", buffer);
		appl.addFile("metadata.json", Buffer.from(`{"version": 1,"manifestURL":"${genURL(url)}"}\n`, "utf8"));
		appl.writeZip(`./cache/${url.split("/")[1]}.zip`);
		fs.copyFileSync(pa + "manifest.webapp", "./cache/manifest.webapp");
		appl = null;
		fs.rmSync(pa, { recursive: true, force: true });
	} catch (err) {
		if (ecb != undefined) ecb(err);
		return;
	}
	if (cb != undefined) cb();
};

const downloadFile = async (url, path) => {
	const res = await fetch(url);
	const fileStream = fs.createWriteStream(path);
	await new Promise((resolve, reject) => {
		res.body.pipe(fileStream);
		res.body.on("error", reject);
		fileStream.on("finish", resolve);
	});
};

const getVersion = (() => {
	let versionCache = {};
	function getVersion(g, cb, ecb) {
		if (versionCache[g]) cb(g);
		fetch("http://kaistone.herokuapp.com/?search=" + encodeURIComponent(g))
			.then((e) => e.json())
			.then((e) => {
				versionCache[g] = e;
				console.log(e.name + " " + e.version);
				if (e.error) return ecb(e.error);
				else cb(e);
			})
			.catch(ecb);
	}
	return getVersion;
})();

function updateVersionFile() {
	fs.writeFileSync("./versions.json", JSON.stringify(versions, null, "\t"), "utf-8");
}

function generateYML(options, cb) {
	console.log(options);
	if (!options) return console.error("no options");
	const path = "../yml/" + options.name + ".yml",
		manifest = JSON.parse(fs.readFileSync(`../arma7x/${options.name}/`, "utf-8")),
		{ stringify } = require("yaml"),
		obj = {};

	if (manifest.name || manifest.display) {
		obj.name = manifest.display || manifest.name;
	} else {
		console.error(options.name + "manifest does not have name!");
		obj.name = options.name;
	}
	if (manifest.developer) obj.author = manifest.developer;

	if (manifest) {
	}

	// fs.writeFileSync(pa + el, h, "utf-8");
}
