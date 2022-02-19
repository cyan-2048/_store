let versions;
let new_versions = [];
const fs = require("fs");

fs.readFile("./versions.json", "utf8", function (err, data) {
	if (err) throw err;
	else {
		versions = JSON.parse(data);
		init();
	}
});

function init() {
	aleInit(() => {
		console.log("New versions: " + JSON.stringify(new_versions));
	});
}

var armaInit, aleInit;
(() => {
	let index = 0;
	function next(cb, func, len) {
		index++;
		if (index == len) {
			if (cb != undefined) cb();
			index = 0;
			return;
		} else {
			func(cb);
		}
	}
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
				return next(cb, armaInit, apps.length);
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
		let fetch = require("node-fetch"),
			n = () => {
				if (index == 5) {
					cb();
					index = 0;
				}
			};
		["bankitube", "bakabakaplayer", "sequiviewer", "audiovis", "musmushighway"].forEach((a) => {
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
						} else checkErr(a, "VERSION NUMBER IS WRONG");
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
