const CPU = require('../cpu/cpu.js');
const GPU = require('../gpu.js');
const MMU = require('../memory_controller.js');
const CC = require('../cartridge_controller.js');

let cartridge = new CC('t');
let gpu = new GPU();
let mmu = new MMU(cartridge, gpu);
let cpu = new CPU(mmu);

let colorMap = {
    3: 255,
    2: 150,
    1: 80,
    0: 0
};

var main_canvas, main_ctx, main_image;
var debug_canvas, debug_ctx, debug_image;

window.onload=function(){
    main_canvas = document.getElementById('screen');
    main_ctx = main_canvas.getContext('2d');
    main_image = main_ctx.createImageData(160,144);

    for(let i=0; i<160*144*4; i++)
        main_image.data[i] = 50;

    main_ctx.putImageData(main_image, 0, 0);
    main_ctx.imageSmoothingEnabled = false;
    setInterval(tick_frame, 0.02);
    main_ctx.scale(3,3);
    debug_view_init();
    let button = document.getElementById("draw_button");
    button.onclick = function () {
        debug_view_draw_tileset();
    }
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

function tick_frame() {
    let cur_f = gpu.frames;
    while(gpu.frames === cur_f){
        let elapsed = cpu.tick();
        gpu.tick(elapsed);
    }

    for(let i=0; i<160*144; i++){
        let c = colorMap[gpu.screen_out[i]];
        main_image.data[i*4] = c;
        main_image.data[i*4+1] = c;
        main_image.data[i*4+2] = c;
        main_image.data[i*4+3] = 255;
    }

    main_ctx.putImageData(main_image, 0, 0);
    main_ctx.drawImage(main_canvas, 0, 0);
    console.log("frame");
}

// while(true){
//     let elapsed = cpu.tick();
//     gpu.tick(elapsed);
// };