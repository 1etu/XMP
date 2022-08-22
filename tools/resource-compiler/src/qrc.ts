import { inflateSync } from "node:zlib";

const CNT_MAGIC = "QRCC";
const ARC_MAGIC = "QRCF";
const CNT_HDR_SIZE = 8;

const TBL_OFF = 0x08;
const TBL_SIZE = 0x0c;
const STR_TBL_OFF = 0x10;
const STR_TBL_SIZE = 0x14;
const TAG_OFF = 0x18;