class MemoryController{
    constructor(cartridge, gpu){
        this.cpu = null;
        this.gpu = gpu;
        this.boot_rom = [
            0x31, 0xfe,0xff,0xaf,0x21,0xff,0x9f,0x32,0xcb,0x7c,0x20,0xfb,0x21,0x26,0xff,0xe,0x11,0x3e,0x80,0x32,0xe2,0xc,0x3e,0xf3,0xe2,0x32,0x3e,0x77,0x77,0x3e,0xfc,0xe0,0x47,
            0x11,0x4,0x1,0x21,0x10,0x80,0x1a,0xcd,0x95,0x0,0xcd,0x96,0x0,0x13,0x7b,0xfe,0x34,0x20,0xf3,0x11,0xd8,0x0,0x6,0x8,0x1a,0x13,0x22,0x23,0x5,0x20,0xf9,0x3e,
            0x19,0xea,0x10,0x99,0x21,0x2f,0x99,0xe,0xc,0x3d,0x28,0x8,0x32,0xd,0x20,0xf9,0x2e,0xf,0x18,0xf3,0x67,0x3e,0x64,0x57,0xe0,0x42,0x3e,0x91,0xe0,0x40,0x4,0x1e,
            0x2,0xe,0xc,0xf0,0x44,0xfe,0x90,0x20,0xfa,0xd,0x20,0xf7,0x1d,0x20,0xf2,0xe,0x13,0x24,0x7c,0x1e,0x83,0xfe,0x62,0x28,0x6,0x1e,0xc1,0xfe,0x64,0x20,0x6,0x7b,
            0xe2,0xc,0x3e,0x87,0xe2,0xf0,0x42,0x90,0xe0,0x42,0x15,0x20,0xd2,0x5,0x20,0x4f,0x16,0x20,0x18,0xcb,0x4f,0x6,0x4,0xc5,0xcb,0x11,0x17,0xc1,0xcb,0x11,0x17,0x5,
            0x20,0xf5,0x22,0x23,0x22,0x23,0xc9,0xce,0xed,0x66,0x66,0xcc,0xd,0x0,0xb,0x3,0x73,0x0,0x83,0x0,0xc,0x0,0xd,0x0,0x8,0x11,0x1f,0x88,0x89,0x0,0xe,0xdc,
            0xcc,0x6e,0xe6,0xdd,0xdd,0xd9,0x99,0xbb,0xbb,0x67,0x63,0x6e,0xe,0xec,0xcc,0xdd,0xdc,0x99,0x9f,0xbb,0xb9,0x33,0x3e,0x3c,0x42,0xb9,0xa5,0xb9,0xa5,0x42,0x3c,0x21,
            0x4,0x1,0x11,0xa8,0x0,0x1a,0x13,0xbe,0x20,0xfe,0x23,0x7d,0xfe,0x34,0x20,0xf5,0x6,0x19,0x78,0x86,0x23,0x5,0x20,0xfb,0x86,0x20,0xfe,0x3e,0x1,0xe0,0x50
        ];

        this.cc = cartridge;
        this.boot_rom_mapped = true;
        this.internal_ram = Array(0x2000).fill(0);
        this.high_speed_ram = Array(0x80).fill(0);
    }

    interrupt_enabled(){ return !!this.cpu.interrupt_master_enable};

    remove_boot_rom(){
        this.boot_rom_mapped = false;
    }

    read_byte(addr){
        if(this.boot_rom_mapped && addr < 0x100)
            return this.boot_rom[addr];

        switch (addr & 0xf000) {
            case 0x0000:
            case 0x1000:
            case 0x2000:
            case 0x3000:
            case 0x4000:
            case 0x5000:
            case 0x6000:
            case 0x7000:
                //ROM in cartridge, forward to cartridge controller :)
                let rr = this.cc.read_byte(addr);
                return rr;

            case 0x8000:
            case 0x9000:
                //GPU VRAM, forward to GPU.
                return this.gpu.read_byte(addr);

            case 0xc000:
            case 0xd000:
            case 0xe000:
                //Access to 8k internal RAM. and first haft of shadow RAM.
                //Shadow RAM is just a waste of address space, a copy of 8k RAM.
                return this.internal_ram[addr & 0x1fff];

            case 0xf000:
                //Interrupt Vector
                if(addr === 0xffff) return this.cpu.interupt_vector.get_byte();
                //Interrupt Request
                if(addr === 0xff0f) return this.cpu.interupt_requests.get_byte();

                //Access to last haft of shadow RAM, and I/O, Interrupt, etc
                let mask = addr & 0xf00;
                if(mask < 0xe00) return this.internal_ram[addr & 0x1fff];
                if(mask >= 0xf00){
                    let sec_mask = addr & 0xff;

                    //GPU I/O Registers
                    if(sec_mask >= 0x40 && sec_mask < 0x50) return this.gpu.read_byte(addr);
                    //Zero Page RAM
                    if(sec_mask >= 0x80) return this.high_speed_ram[addr & 0x7f];

                    console.warn(`MMU: Reading I/O blocks: ${addr.toString(16)}`);
                    return 0xff;
                }

                console.warn(`MMU: Reading I/O blocks: ${addr.toString(16)}`);
                break;
            default:
                console.warn(`MMU: Reading from unknown address mapping: ${addr.toString(16)}`);
        }
    }

    read_word(addr){
        return this.read_byte(addr) + (this.read_byte(addr + 1) << 8);
    }

    write_byte(addr, v){
        if(typeof v === "undefined") throw "Man, check your code, cant write invalid byte"; //Debug

        switch (addr & 0xf000) {
            case 0x0000:
            case 0x1000:
            case 0x2000:
            case 0x3000:
            case 0x4000:
            case 0x5000:
            case 0x6000:
            case 0x7000:
                //Write to ROM, sound weird, right? Never mind just forward to cartridge controller :)
                this.cc.write_byte(addr, v);
                break;

            case 0xc000:
            case 0xd000:
            case 0xe000:
                this.internal_ram[addr & 0x1fff] = v;
                break;

            case 0x8000:
            case 0x9000:
                this.gpu.write_byte(addr, v);
                break;

            case 0xf000:
                if(addr === 0xffff){ this.cpu.interupt_vector.set_byte(v); break;}
                if(addr === 0xff0f){ this.cpu.interupt_requests.set_byte(v); break;}
                if(addr === 0xff50){
                    this.boot_rom_mapped = false; break;}

                if(addr === 0xff01 || addr === 0xff02){
                    //TODO: Serial port
                    break;
                }

                let mask = addr & 0xf00;
                if(mask < 0xe00){
                    this.internal_ram[addr & 0x1fff] = v;
                    break;
                }
                if(mask === 0xe00){
                    if(addr >= 0xfea0) break;
                    this.gpu.write_byte(addr, v); break;
                }
                if(mask >= 0xf00){
                    let sec_mask = addr & 0xff;

                    if(sec_mask >= 0x10 && sec_mask <= 0x3f){
                        //TODO: Sound devices :)
                        break;
                    }

                    //GPU I/O Registers
                    if(sec_mask >= 0x40 && sec_mask < 0x50){
                        this.gpu.write_byte(addr, v);
                        break;
                    }

                    //Zero Page RAM
                    if(sec_mask >= 0x80){
                        this.high_speed_ram[addr & 0x7f] = v;
                        break;
                    }
                }

                console.warn(`MMU: Writing unknown address mapping: ${addr.toString(16)}`);
                break;
            default:
                console.warn(`MMU: Writing to unknown address mapping: ${addr.toString(16)}, PC: ${this.cpu.regs.pc.toString(16)}, INS: ${this.read_byte(this.cpu.regs.pc)}`);
        }
    }


    write_word(addr, v){
        this.write_byte(addr, v & 0xff);
        this.write_byte(addr + 1, v >> 8);
    }
}

module.exports = MemoryController;