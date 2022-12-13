import hawk from "hawk";
import { getToken, saveToken } from "./token.js";

export default class Requester {
  auth = {
    method: "api-key",
    key: "baJ_nea27HqSskijhZlT",
  };
  api = {
    app: {
      id: "CAlTn_6yQsgyJKrr-nCh",
      name: "KaiOS Plus",
      ver: "2.5.4",
    },
    server: {
      url: "https://api.kaiostech.com",
    },
    ver: "3.0",
  };

  constructor(onerror = () => {}) {
    this.onerror = onerror;
  }

  async init() {
    try {
      const _token = await getToken();
      if (_token) {
        this.token = _token;
        return;
      }
      const token = await this.send({
        method: "POST",
        data: {
          brand: "AlcatelOneTouch",
          device_id: "123456789012345",
          device_type: 999999,
          model: "GoFlip2",
          os: "KaiOS",
          os_version: "2.5.4",
          reference: "4044O-2BAQUS1-R",
        },
        path: "/v3.0/applications/CAlTn_6yQsgyJKrr-nCh/tokens",
        headers: {
          Authorization: "Key baJ_nea27HqSskijhZlT",
        },
        type: "json",
      });
      this.token = token;
      saveToken(token);
    } catch (error) {
      this.onerror(error);
    }
  }

  async send(req) {
    function createHeaderValue(obj) {
      let arr = [];
      for (const key in obj) {
        const val = obj[key];
        arr.push(`${key}="${val}"`);
      }
      return arr.join(", ");
    }

    const payload = ["POST", "PUT"].includes(req.method)
      ? req.contentType && req.contentType !== "application/json"
        ? req.data
        : JSON.stringify(req.data)
      : null;

    const options = {
      method: req.method,
      headers: {
        "Kai-API-Version": "3.0",
        "Kai-Request-Info": createHeaderValue({
          ct: "wifi",
          rt: "auto",
          utc: Date.now(),
          utc_off: 1,
          mcc: 0,
          mnc: 0,
          net_mcc: null,
          net_mnc: null,
        }),
        "Kai-Device-Info": createHeaderValue({ imei: "123456789012345", curef: "4044O-2BAQUS1-R" }),
        "User-agent": "Mozilla/5.0 (Mobile; GoFlip2; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5.4",
        "Content-type": req.contentType || "application/json",
      },
      body: payload,
    };

    const path = req.path[0] == "/" ? "https://api.kaiostech.com" + req.path : req.path;

    if ("object" === typeof req.headers) {
      Object.assign(options.headers, req.headers);
    }

    if (this.token) {
      const hawkinfo = {
        credentials: {
          id: this.token.kid,
          algorithm: "sha256",
          key: Buffer.from(this.token.mac_key, "base64"),
        },
      };

      if (payload) {
        hawkinfo.payload = payload;
        hawkinfo.contentType = options.headers["Content-type"];
      }

      options.headers["Authorization"] = hawk.client.header(path, req.method, hawkinfo).header;
    }

    const resp = await fetch(path, options);

    return req.type === "json" ? resp.json() : resp;
  }
}
