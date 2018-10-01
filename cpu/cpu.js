const {handler, get_ins_name} = require("./cpu_instructions");
const {bitarray8, bitarray8_to_number} = require("../utils.js");

let ins_handler = handler;

let interrupt_addr_map = [
    0x40, //V-Blank
    0x48, //LCD STAT
    0x50, //Timer
    0x58, //Serial
    0x60  //Joypad
];

class CPUInterruptRecord{
    constructor(){
        this.vector = {
            vblank: 0,
            lcdstat: 0,
            timer: 0,
            serial: 0,
            joypad: 0,
        };

        this.keys = Object.keys(this.vector);
    }

    set_byte(v){
        let ba = bitarray8(v);
        for(let i = 0; i < 5; i++)
            this.vector[this.keys[i]] = ba[i];
    }

    get_byte(){
        return bitarray8_to_number([...this.keys.map(i => this.vector[i]), 0, 0, 0]);
    }
}

class CPU{
    constructor(mmu, gpu){
        this.serialid = "haoyan_number_1";
        this.reset();
        this.mmu = mmu;
        this.gpu = gpu;
        this.gpu.cpu = this;
        this.mmu.cpu = this;

        this.history = [];
    }

    reset(){
        this.cycles = 0;
        this.ins_count = 0;
        this.regs = {
            //Sorted as the address sequence.
            b: 0, c: 0, //8 bit
            d: 0, e: 0, //8 bit
            h: 0, l: 0, //8 bit
            a: 0, f: 0, //8 bit, f is flag register: Z N H C 0 0 0 0
            sp: 0, //16 bit stack pointer
            pc: 0 //16 bit program counter
        };

        this.reg_keys = Object.keys(this.regs);

        this.interupt_vector = new CPUInterruptRecord();
        this.interupt_requests = new CPUInterruptRecord();
        this.interrupt_master_enable = 0;
    }

    request_vblank_interrupt(){
        this.interupt_requests.vector.vblank = 1;
    }

    get_reg(addr){
        if(addr < 6) return this.regs[this.reg_keys[addr]];
        switch(addr){
            case 0x6: return (this.regs.h << 8) + this.regs.l;
            case 0x7: return this.regs.a;
        }
    }

    set_reg(addr, v){
        if(typeof v === "undefined") throw "You can't set reg this way"; //DEBUG

        if(addr < 6){
            this.regs[this.reg_keys[addr]] = v;
            return;
        }
        switch (addr) {
            case 0x6:
                this.regs.h = v >> 8;
                this.regs.l = v & 0xff;
                break;
            case 0x7:
                this.regs.a = v;
        }
    }

    f_set_zero(){this.regs.f |= 0x80;}
    f_reset_zero(){this.regs.f &= 0x7f;}
    f_set_sub(){this.regs.f |= 0x40;}
    f_reset_sub(){this.regs.f &= 0xbf;}
    f_set_hcarry(){this.regs.f |= 0x20;}
    f_reset_hcarry(){this.regs.f &= 0xdf;}
    f_set_carry(){this.regs.f |= 0x10;}
    f_reset_carry(){this.regs.f &= 0xef;}
    f_reset(){this.regs.f &= 0xf;}

    f_zero(){return !!(this.regs.f & 0x80);}
    f_sub(){return !!(this.regs.f & 0x40);}
    f_carry(){return !!(this.regs.f & 0x10);}
    f_hcarry(){return !!(this.regs.f & 0x20);}

    stack_push_16(v){
        this.regs.sp--;
        this.mmu.write_byte(this.regs.sp, v >> 8);
        this.regs.sp--;
        this.mmu.write_byte(this.regs.sp, v & 0xff);
        this.regs.sp &= 0xffff;
    }

    stack_pop_16(){
        let v = this.mmu.read_byte(this.regs.sp);
        this.regs.sp++;
        v += this.mmu.read_byte(this.regs.sp) << 8;
        this.regs.sp++;
        this.regs.sp &= 0xffff;
        return v;
    }

    debug_check_regs(op){
        this.reg_keys.forEach(k => {
            if(typeof this.regs[k] === 'undefined')
                console.log(`Damn ${op}`);
        })
    }

    tick(){
        //Check requested interrupts
        if(this.interrupt_master_enable){
            for(let i = 0; i < 5; i++){
                let k = this.interupt_requests.keys[i];
                if(this.interupt_vector.vector[k] && this.interupt_requests.vector[k]){
                    this.interupt_requests.vector[k] = 0;
                    this.rst_at(interrupt_addr_map[i]);
                    break;
                }
            }
        }

        //Fetch and execute instructions
        let op = this.mmu.read_byte(this.regs.pc);
        this.history.push(`PC:0x${this.regs.pc.toString(16)}, OP:0x${op.toString(16)} NAME: ${get_ins_name(op)}`);
        if(this.history.length > 100) this.history.shift();

        let rep = ins_handler(this, op);

        this.debug_check_regs(op);
        this.cycles += rep.cycle;
        this.regs.pc += rep.pc;

        this.ins_count++;
        return rep.cycle;
    }

    rst_at(addr){ //Used by interrupts and RST instructions.
        console.log(`INT: 0x${addr.toString(16)}`);
        this.stack_push_16(this.regs.pc + 1);
        this.regs.pc = addr;
        this.disable_int_master();
    }

    disable_int_master(){
        this.interrupt_master_enable = 0;}
    enable_int_master(){
        this.interrupt_master_enable = 1;}

    print_state(){
        console.log({
            reg: this.regs,
            cycles: this.cycles,
            steps: this.ins_count
        });
    }

    print_f_ram(){
        this.mmu.high_speed_ram.forEach(i => console.log(i));
    }

    print_regs(){
        console.log(this.regs);
    }

}

module.exports = CPU;