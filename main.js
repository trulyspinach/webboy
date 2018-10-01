const CPU = require('./cpu/cpu.js');
const GPU = require('./gpu.js');
const MMU = require('./memory_controller.js');
const CC = require('./cartridge_controller.js');

const convertHrtime = require('convert-hrtime');

let cartridge = new CC("./cartridges/cpu_instrs.gb");
// let cartridge = new CC("cpu_test");
let gpu = new GPU();
let mmu = new MMU(cartridge, gpu);
let cpu = new CPU(mmu, gpu);
cartridge.extract_rom();
var cl = 70224;
var start_time = process.hrtime();
while(true){
     // cpu.print_state();
    // if(cpu.cycles > 800000000) break;
    try{
        let elapsed = cpu.tick();
        gpu.tick(elapsed);
    } catch(e){
        console.error(e);
        cpu.print_state();
        // cpu.print_f_ram();
        break;
    }

}

let up_seconds = convertHrtime(process.hrtime(start_time)).seconds;
let frames = cpu.cycles / 70224;
console.log(`Up time: ${up_seconds}`);
console.log(`Frames: ${frames}`);
console.log(`Average FPS: ${frames / up_seconds}`);
console.log(`GPU Frames: ${gpu.frames}`);