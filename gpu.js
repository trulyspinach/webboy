let array8 = [0,1,2,3,4,5,6,7];

class GPU{
    constructor(){
        this.screen_out = Array(160 * 144).fill(0);

        this.vram = Array(0x2000).fill(0);
        this.lcdc = 0;
        this.stat = 0;

        this.scy = 0; this.scx = 0; //background scroll
        this.ly = 0; // current drawing line
        this.lyc = 0; //line compare
        this.wy = 0; this.wx = 0; //window position

        this.bg_pal = 0;
        this.obj_pal0 = 0;
        this.obj_pal1 = 0;

        this.tile_cache = Array(384).fill(0); //set all cache dirty.

        this.clock = 0;
        this.frames = 0;
        // this.mode_cycles = [207, 4560, 83, 175]; // HBlank, VBlank, OAM Read, OAM and VRAM Read
    }

    set_lcd_enable(e){let code = e << 7; this.lcdc = (this.lcdc & ~code) | code;}
    lcd_enabled(){return this.lcdc & 0x80;}
    set_window_tilemap(v){ let code = v << 6; this.lcdc = (this.lcdc & ~code) | code; throw "GPU: Window not implemented.";}
    window_tilemap(){ return this.lcdc & 0x40;}
    set_window_enable(e){ let code = e << 5; this.lcdc = (this.lcdc & ~code) | code; throw "GPU: Window not implemented.";}
    window_enabled(){ return this.lcdc & 0x20;}
    set_tile_data_select(v){ let code = v << 4; this.lcdc = (this.lcdc & ~code) | code;}
    tile_data_select(){return this.lcdc & 0x10;}
    set_background_tilemap(v){let code = v << 3; this.lcdc = (this.lcdc & ~code) | code;}
    background_tilemap(){return this.lcdc * 0x8;}
    set_sprite_size(v){let code = v << 2; this.lcdc = (this.lcdc & ~code) | code;}
    sprite_size(){return this.lcdc & 0x4;}
    set_sprite_enable(e){let code = e << 1; this.lcdc = (this.lcdc & ~code) | code; throw "GPU: Sprite not implemented."}
    sprite_enabled(){return this.lcdc & 0x2;}
    set_background_enabled(v){let code = v << 0; this.lcdc = (this.lcdc & ~code) | code;}
    background_enabled(){return this.lcdc & 0x1;}

    mode(){ return this.stat & 0x3;}
    set_mode(m){
        this.stat = (this.stat & 0xfc) | m;
    }

    reset(){
        this.screen_out = Array(160 * 144).fill(0);

        this.vram = Array(0x2000).fill(0);
        this.lcdc = 0;
        this.stat = 0;

        this.scy = 0; this.scx = 0;
        this.ly = 0;
        this.lyc = 0;
        this.wy = 0; this.wx = 0;

        this.bg_pal = 0;
        this.obj_pal0 = 0;
        this.obj_pal1 = 0;

        this.clock = 0;
        this.frames = 0;
    }

    tick(cycles){
        if(!this.lcd_enabled()){
            // this.reset();
            return;
        }

        this.clock += cycles;
        if(this.clock > 456){
            this.clock = this.clock - 456;
            this.ly++;
        }

        this.tick_line();
    }

    tick_line(){
        let should_renderer = false;
        //A cycle is finished
        if(this.ly > 153) this.ly = 0;

        //During VBlank
        if(this.ly > 143 && this.mode() !== 1){
            this.set_mode(1);
            //TODO: VBlank Interrupt
            this.frames++;
            this.generate_tile_cache();
            // if(this.frames % 20 === 0) this.print_screen();
            return;
        }
        if(this.ly > 143) return; //If in VBlank, there is nothing to do.

        //Line number is less than 144, normal drawing..
        //During OAM Read
        if(this.clock <= 80 && this.mode() !== 2){
            this.set_mode(2);
            //TODO: OAM STAT Interrupt..
        }

        if(this.clock > 80 && this.clock <= 252 && this.mode() !== 3 && this.mode() !== 1){
            this.set_mode(3);
            //TODO: All Interrupt
            //really ?
        }

        //During HBlank
        if(this.clock > 252 && this.mode() !== 0 && this.mode() !== 1){
            this.set_mode(0);
            //TODO: HBlank Interrupt
            should_renderer = true;
        }

        if(!should_renderer) return;

        if(this.background_enabled()) this.draw_background(this.ly);
        //TODO: draw this line
    }

    draw_background(l){
        let tm_offset = this.background_tilemap()? 0x9800 : 0x9c00;
        let tile_y = ((l + this.scy) & 0xff) >> 3; //warp and divide by 8.
        let y = (l + this.scy) & 0x7;

        for(let x = 0; x < 160; x++){
            let tile_x = ((this.scx + x) & 0xff) >> 3;

            let t_addr = this.read_byte(tm_offset + tile_y * 32 + tile_x);
            let tile = this.tile_at(t_addr);
            if(tile === 0) continue;
            this.screen_out[160 * l + x] = this.color_for(this.bg_pal, tile[y][(x + this.scx) & 7]);
        }
    }

    tile_at(addr){
        let offset = this.tile_data_select()? 0 : 128;
        addr = this.tile_data_select()? addr : to_signed_int8(addr);
        return this.tile_cache[addr];
    }

    generate_tile_cache(){
        let offset = 0x8000;

        for(let t = 0; t < 384; t++){
            if(this.tile_cache[t] !== 0) continue;

            let d = [...Array(16).keys()].map(i => bitarray8(this.read_byte(offset + i + (t * 16))));
            this.tile_cache[t] = array8.map(i =>
                array8.map(bit =>
                    d[i * 2][bit] + d[i * 2 + 1][bit] * 2
                )
            );
        }
    }

    debug_draw_tile1(){
        let sc = [];
        for(let i = 0; i < 256; i++){
            sc.push(this.tile_at((i * 16)));
        }
        return sc;
    }

    color_for(palette, v){
        let p = bitarray8(palette);
        let b = 3 - v;
        return p[b*2] + (p[b*2+1] << 1);
    }

    read_byte(addr){
        switch (addr & 0xf000) {

            case 0x8000:
            case 0x9000:
                return this.vram[addr & 0x1fff];

            case 0xf000:
                switch(addr){
                    case 0xff40: return this.lcdc;
                    case 0xff41: return this.stat;
                    case 0xff42: return this.scy;
                    case 0xff43: return this.scx;
                    case 0xff44: return this.ly;
                    case 0xff45: return this.lyc;
                    case 0xff4a: return this.wy;
                    case 0xff4b: return this.wx;
                    case 0xff47: return this.bg_pal;
                    case 0xff48: return this.obj_pal0;
                    case 0xff49: return this.obj_pal1;
                    default: throw `GPU: Unknown address ${addr.toString(16)}`;
                }

            default:
                throw `GPU: Unknown address ${addr.toString(16)}`;
        }
    }

    write_byte(addr, v){
        switch (addr & 0xf000) {

            case 0x8000:
            case 0x9000:
                this.tile_cache = Array(384).fill(0); //TODO: determine dirty.
                this.vram[addr & 0x1fff] = v;
                break;

            case 0xf000:
                switch (addr) {
                    case 0xff40: this.lcdc = v; break;
                    case 0xff41: console.error("GPU: Interrupt select not implemented.");//return this.stat;
                    case 0xff42: this.scy = v; break;
                    case 0xff43: this.scx = v; break;
                    case 0xff44: throw "GPU: Don't fuck with line counter.";
                    case 0xff45: throw "GPU: LYC not implemented.";
                    case 0xff4a: this.wy = v; break;
                    case 0xff4b: this.wx = v; break;
                    case 0xff47: this.bg_pal = v; break;
                    case 0xff48: this.obj_pal0 = v; break;
                    case 0xff49: this.obj_pal1 = v; break;
                    default: throw `GPU: Writing to unknown address ${addr.toString(16)}`;
                }
                break;

            default:
                throw `GPU: Writing to unknown address ${addr.toString(16)}`;
        }
    }

    print_screen(){
        let s = "";
        for(let y = 0; y < 144; y++){
            for(let x = 0; x < 160; x++){
                s += this.screen_out[y * 160 + x].toString();
            }
            s += "\n";
        }
        console.log(s);
    }
}

//Helper
function to_signed_int8(v) {
    if(v & 0x80) {
        return -(~v & 0xff) - 1;
    }

    else return v & 0xff;
}


function bit_at(num, index){ return num & (0x1 << index);}

function bitarray8(v){
    return [...Array(8).keys()].map(i => (v >> (7 - i)) & 1);
}


module.exports = GPU;