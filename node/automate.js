let versions;
let new_versions = [];
const fs = require("fs"),
	fetch = require("node-fetch");

fs.readFile("./versions.json", "utf8", function (err, data) {
	if (err) throw err;
	else {
		versions = JSON.parse(data);
		init();
	}
});

function init() {
	suborgInit(() => {
		console.log("New versions: " + JSON.stringify(new_versions) + "\n");
		aleInit(() => {
			console.log("New versions: " + JSON.stringify(new_versions) + "\n");
			armaInit(() => {
				console.log("New versions: " + JSON.stringify(new_versions));
			});
		});
	});
}

var armaInit, aleInit, suborgInit;
(() => {
	let index = 0;

	function initStart(a) {
		if (index == 0) {
			new_versions = [];
			console.log(`Checking versions of ${a}'s apps...`);
		}
	}
	function checkErr(i, h) {
		console.log(`error app check ver: ${i} => ` + h);
	}

	armaInit = (cb) => {
		initStart("arma7x");
		const apps = ["atm", "k file", "k-pocket", "k-music", "todoist", "mdx", "k-video", "the economy", "habit tracker"],
			i = apps[index],
			n = () => {
				index++;
				if (index == apps.length) {
					index = 0;
					if (cb != undefined) cb();
					return;
				} else {
					armaInit(cb);
				}
			};
		getVersion(
			i,
			(e) => {
				if (e != versions[i]) {
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

	aleInit = (cb) => {
		initStart("ale4710");
		const arr = ["bankitube", "bakabakaplayer", "sequiviewer", "audiovis", "musmushighway"],
			n = () => {
				if (index == arr.length) {
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

	suborgInit = (cb) => {
		initStart("suborg");
		const arr = ["appbuster", "crosstweak", "dale-8", "fastcontact", "fastlog", "mobipico", "origami", "wallace-toolbox"],
			n = () => {
				if (index == arr.length) {
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
					if (latest != i) {
						console.log(`new ver: ${a} = ${i} -> ${latest}`);
						new_versions.push(a);
					}
					n();
				});
		});
	};
})();

const getDirectories = (source) => {
	return fs
		.readdirSync(source, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name);
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
