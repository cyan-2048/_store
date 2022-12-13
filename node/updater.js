import Requester from "./kaistone.js";

const req = new Requester(console.error);

await req.init();

console.log("Requesting app list...");

const data = await req.send({
  method: "GET",
  path: `/kc_ksfe/v1.0/apps?os=2.5.4&category=30&mcc=null&mnc=null&bookmark=false`,
  type: "json",
});

console.log(data.apps);

// const wa = data.apps.find((app) => app.name === "whatsapp");

/*if (process.env.APP_VERSION) {
  if (compareVersions(wa.version, process.env.APP_VERSION) <= 0) {
    console.log("Version is new enough. Exiting.");
    return;
  }
}
console.log("Downloading package...");

const resp = await req.send({
  method: "GET",
  path: wa.package_path,
});

console.log(await resp.blob());
*/
