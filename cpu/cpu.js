const ins_handler = require("./cpu_instructions");

class CPU{
    constructor(mmu){
        this.serialid = "haoyan_number_1";
        this.reset();
        this.mmu = mmu;
        this.mmu.cpu = this;
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

    f_zero(){return (this.regs.f & 0x80)? 1:0;}
    f_sub(){return (this.regs.f & 0x40)? 1:0;}
    f_carry(){return (this.regs.f & 0x10)? 1:0;}
    f_hcarry(){return (this.regs.f & 0x20)? 1:0;}

    stack_push_16(v){
        this.regs.sp--;
        this.mmu.write_byte(this.regs.sp, v >> 8);
        this.regs.sp--;
        this.mmu.write_byte(this.regs.sp, v & 0xff);
    }

    stack_pop_16(){
        let v = this.mmu.read_byte(this.regs.sp);
        this.regs.sp++;
        v += this.mmu.read_byte(this.regs.sp) << 8;
        this.regs.sp++;
        return v;
    }

    debug_check_regs(op){
        this.reg_keys.forEach(k => {
            if(typeof this.regs[k] === 'undefined')
                console.log(`Damn ${op}`);
        })
    }

    tick (){
        let op = this.mmu.read_byte(this.regs.pc);
        let rep = ins_handler(this, op);
        this.debug_check_regs(op);
        this.cycles += rep.cycle;
        this.regs.pc += rep.pc;

        this.ins_count++;
        return rep.cycle;
    }

    rst_at(addr){
        this.stack_push_16(this.regs.pc + 1);
        this.regs.pc = addr;
        this.disable_int_master();
    }

    disable_int_master(){ this.mmu.write_byte(0xffff, 0);}
    enable_int_master(){ this.mmu.write_byte(0xffff, 1);}

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