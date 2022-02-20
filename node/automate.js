let versions;
const fs = require("fs"),
	fetch = require("node-fetch"),
	chalk = require("chalk"),
	AdmZip = require("adm-zip"),
	aleCache = {},
	suborgCache = {};
updated = [];

fs.readFile("./versions.json", "utf8", function (err, data) {
	if (err) throw err;
	else {
		versions = JSON.parse(data);
		init();
	}
});

console.error = (e) => {
	try {
		process.stdout.write("\x07");
	} catch (err) {
		console.log("\x07");
	}
	console.log(chalk.white.bgRed(e));
};
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
	App.armaInit(() =>
		App.armaFormat(() =>
			App.suborgInit(() =>
				App.suborgFormat(() => {
					if (updated.length != 0) {
						var shell = require("shelljs");
						console.green("running git!");
						shell.exec(`git add . && git commit -m "this commit is automated! ${updated.join(", ")}"`);
					}
				})
			)
		)
	);
}

const App = {};
let new_versions = ["crosstweak"];
(() => {
	const compareVersions = require("compare-versions");
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

	App.armaInit = (cb) => {
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
					App.armaInit(cb);
				}
			};
		getVersion(
			i,
			(e) => {
				if (compareVersions(versions["arma7x"][i], e) < 0) {
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
	};
	App.armaFormat = (cb) => {
		if (new_versions.length == 0) {
			if (cb) cb();
			return;
		}
		upStart("arma7x");
		let dict = {
			atm: "pocket-atm",
			"k file": "b2gfm",
			"k-pocket": "K-Pocket-Browser",
			"k-music": "kaimusic",
			todoist: "k-todoist",
			mdx: "kai-mdx-dictionary",
			"k-video": "k-video-player",
			"the economy": "The-Economy",
			habit: "kai-habit-tracker",
		};
		let app = new_versions[index],
			i = dict[app],
			pa = `./cache/${i}-master/`,
			n = () => {
				index++;
				if (index == new_versions.length) {
					console.green("Done updating arma7x's apps!!!");
					updateVersionFile();
					index = 0;
					if (cb != undefined) cb();
					return;
				} else App.armaFormat(cb);
			},
			error = (e) => {
				console.error(e);
				n();
			};
		initApp(i);
		downloadFile(`https://github.com/arma7x/${i}/archive/refs/heads/master.zip`, "./cache/master.zip").then(() => {
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
							getVersion(app, (v) => {
								updated.push(`${i} = ${versions.arma7x[app]} => ${v}`);
								versions["arma7x"][app] = v;
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
		});
	};

	App.aleInit = (cb) => {
		initStart("ale4710", "bgRed");
		const arr = ["bankitube", "bakabakaplayer", "sequiviewer", "audiovis", "musmushighway"],
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
	};

	App.suborgInit = (cb) => {
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
					if (compareVersions(i, latest) < 0) {
						console.log(`new ver: ${a} = ${i} -> ${latest}`);
						suborgCache[a] = latest;
						new_versions.push(a);
					}
					n();
				});
		});
	};
	App.suborgFormat = (cb) => {
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
				} else App.suborgFormat(cb);
			},
			error = (e) => {
				console.error(e);
				n();
			};
		initApp(i);
		downloadFile(`https://gitlab.com/suborg/${i}/-/archive/${b}/${i}-${b}.zip`, "./cache/master.zip").then(() => {
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
		});
	};
})();

const getDirectories = (source) => {
	return fs
		.readdirSync(source, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name);
};
const getFiles = (source) => {
	return fs
		.readdirSync(source, { withFileTypes: true })
		.filter((dirent) => !dirent.isDirectory())
		.map((dirent) => dirent.name);
};

const unzip = (cb, ecb) => {
	// the zip will always be master
	let pa = "./cache/master.zip",
		ca = "./cache/";
	try {
		var zip = new AdmZip(pa);
		zip.extractAllTo(ca, true);
		fs.rmSync(pa, { recursive: true, force: true });
		zip = null;
		// let dirs = getDirectories(ca);
		// if (dirs[0].includes("-main")) {
		// 	fs.renameSync(ca + dirs[0], ca + dirs[0].replace("-main", "-master"));
		// }
	} catch (err) {
		if (ecb != undefined) ecb(err);
		return;
	}
	if (cb != undefined) cb();
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

let getver_cache = null;

function getVersion(g, cb, ecb) {
	function data(y) {
		let wa = y.apps.find((app) => app.display.toLowerCase().includes(g));
		if (wa !== undefined) {
			if (cb !== undefined) cb(wa.version);
		} else {
			let err = "Error: APP NOT FOUND!";
			console.error(err);
			if (ecb != undefined) ecb(err);
		}
		return;
	}
	if (getver_cache !== null) {
		data(getver_cache);
		return;
	}
	const Requester = require("./kaistone-requester");
	new Requester(
		{
			method: "api-key",
			key: "baJ_nea27HqSskijhZlT",
		},
		{
			app: {
				id: "CAlTn_6yQsgyJKrr-nCh",
				name: "KaiOS Plus",
				ver: "2.5.4",
			},
			server: {
				url: "https://api.kaiostech.com",
			},
			ver: "3.0",
		},
		{
			model: "GoFlip2",
			imei: "123456789012345",
			type: 999999,
			brand: "AlcatelOneTouch",
			os: "KaiOS",
			version: "2.5.4",
			ua: "Mozilla/5.0 (Mobile; GoFlip2; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5.4",
			cu: "4044O-2BAQUS1-R",
			mcc: "0",
			mnc: "0",
		},
		(err) => {
			if (ecb != undefined) ecb(err);
			throw err;
		},
		function () {
			this.send({
				method: "GET",
				path: `/kc_ksfe/v1.0/apps?os=2.5.4&mcc=null&mnc=null&bookmark=false`,
				type: "json",
			}).then((d) => {
				getver_cache = d;
				data(d);
			});
		}
	);
}

function updateVersionFile() {
	fs.writeFileSync("./versions.json", JSON.stringify(versions, null, "\t"), "utf-8");
}
