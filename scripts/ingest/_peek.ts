import { readFileSync } from "node:fs";
async function main(){
  const b=JSON.parse(readFileSync("scripts/ingest/_pole-batches/energy_grid-001.json","utf8"));
  console.log("issue:",b.issue,"batchId:",b.batchId,"count:",b.bills.length);
  for(const x of b.bills.slice(0,4)){
    console.log("\n— bill_id:",x.bill_id);
    console.log("  title:",x.title);
    console.log("  summary:",x.summary?x.summary.slice(0,220)+"…":"(null)");
  }
}
main();
