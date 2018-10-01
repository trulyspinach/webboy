const CPU = require('../cpu/cpu.js');
const GPU = require('../gpu.js');
const MMU = require('../memory_controller.js');
const CC = require('../cartridge_controller.js');

let cartridge = new CC('cpu_test');
let gpu = new GPU();
let mmu = new MMU(cartridge, gpu);
let cpu = new CPU(mmu, gpu);

let colorMap = {
    3: 255,
    2: 150,
    1: 80,
    0: 0
};

let main_canvas, main_ctx, main_image;
let debug_canvas, debug_ctx, debug_image;
let ins_his_text, cpu_text;

window.onload=function(){
    main_canvas = document.getElementById('screen');
    main_ctx = main_canvas.getContext('2d');
    main_image = main_ctx.createImageData(160,144);

    ins_his_text = document.getElementById('current_ins');
    cpu_text = document.getElementById('reg');

    for(let i=0; i<160*144*4; i++)
        main_image.data[i] = 50;

    main_ctx.putImageData(main_image, 0, 0);
    main_ctx.imageSmoothingEnabled = false;
    // setInterval(tick_frame, 0.02);
    main_ctx.scale(3,3);
    debug_view_init();
    let button = document.getElementById("draw_button");
    button.onclick = function () {
        debug_view_draw_tileset();
    };

    document.getElementById("run_button").onclick = start;
    document.getElementById("run_boot_rom_button").onclick = run_bios;
    document.getElementById("run_ins_button").onclick = tick_instruction;

};

function debug_view_init(){
    debug_canvas = document.getElementById('debug');
    debug_ctx = debug_canvas.getContext('2d');
    debug_ctx.scale(2,2);
    debug_image = debug_ctx.createImageData(256,256);
    debug_ctx.imageSmoothingEnabled = false;
    for(let i=0; i<256*256*4; i++)
        debug_image.data[i] = 20;

    debug_ctx.putImageData(debug_image, 0, 0);
    debug_ctx.drawImage(debug_canvas, 0, 0);
}

function debug_view_draw_tileset(){
    for(let i = 0; i < 256; i++){
        debug_view_draw_tile(i, gpu.tile_cache[i]);
    }
    debug_ctx.putImageData(debug_image, 0, 0);
    debug_ctx.drawImage(debug_canvas, 0, 0);
}

function debug_view_draw_tile(tile_index, tile_data){
    let y_off = (tile_index >> 5) * 8;
    let x_off = (tile_index & 0x1f) * 8;

    for(let y = 0; y < 8; y++){
        for(let x = 0; x < 8; x++){
            let cc = colorMap[tile_data[y][x]];
            debug_image.data[((y_off + y) * 256 + x_off + x) * 4 ] = cc;
            debug_image.data[((y_off + y) * 256 + x_off + x) * 4 + 1] = cc;
            debug_image.data[((y_off + y) * 256 + x_off + x) * 4 + 2] = cc;
            debug_image.data[((y_off + y) * 256 + x_off + x) * 4 + 3] = 255;
        }
    }
}

function start(){
    setInterval(tick_frame, 0.02);
}

function display_info() {
    ins_his_text.value = cpu.history.join('\n');
    cpu_text.value = `
    A: ${cpu.regs.a.toString(16)}, F: ${cpu.regs.f.toString(16)}, \n
    B: ${cpu.regs.b.toString(16)}, C: ${cpu.regs.c.toString(16)}, \n
    D: ${cpu.regs.d.toString(16)}, E: ${cpu.regs.e.toString(16)}, \n
    H: ${cpu.regs.h.toString(16)}, L: ${cpu.regs.l.toString(16)}, \n
    SP: ${cpu.regs.sp.toString(16)}, PC: ${cpu.regs.pc.toString(16)}.`;
}

function tick_instruction() {
    let elapsed = cpu.tick();
    gpu.tick(elapsed);

    renderer_screen();
    display_info();
}

function run_bios(){
    while (mmu.boot_rom_mapped){
        let elapsed = cpu.tick();
        gpu.tick(elapsed);
    }

    renderer_screen();
    display_info();
}

function tick_frame() {
    let cur_f = gpu.frames;
    while(gpu.frames === cur_f){
        let elapsed = cpu.tick();
        gpu.tick(elapsed);
    }

    renderer_screen();
}

function renderer_screen(){
    for(let i=0; i<160*144; i++){
        let c = colorMap[gpu.screen_out[i]];
        main_image.data[i*4] = c;
        main_image.data[i*4+1] = c;
        main_image.data[i*4+2] = c;
        main_image.data[i*4+3] = 255;
    }

    main_ctx.putImageData(main_image, 0, 0);
    main_ctx.drawImage(main_canvas, 0, 0);
}

// while(true){
//     let elapsed = cpu.tick();
//     gpu.tick(elapsed);
// };