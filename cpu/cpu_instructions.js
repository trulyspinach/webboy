const {ext_handler, GET_REG, SET_REG} = require('./cpu_instructions_ext.js');
const {to_signed_int8, rotate} = require('../utils.js');

function NOP(h){ return {pc: 1, cycle: 4};}
function STOP(h){ alert("System paused"); return {pc: 2, cycle: 4};}

function JR(h){ h.regs.pc = (h.regs.pc + 2 + to_signed_int8(h.mmu.read_byte(h.regs.pc + 1))) & 0xffff; return {pc: 0, cycle: 12};}
function JR_NZ(h){ if(h.f_zero()) return {pc: 2, cycle: 8}; h.regs.pc = (h.regs.pc + 2 + to_signed_int8(h.mmu.read_byte(h.regs.pc + 1))) & 0xffff; return {pc: 0, cycle: 12};}
function JR_Z(h){ if(!h.f_zero()) return {pc: 2, cycle: 8}; h.regs.pc = (h.regs.pc + 2 + to_signed_int8(h.mmu.read_byte(h.regs.pc + 1))) & 0xffff; return {pc: 0, cycle: 12};}
function JR_NC(h){ if(h.f_carry()) return {pc: 2, cycle: 8}; h.regs.pc = (h.regs.pc + 2 + to_signed_int8(h.mmu.read_byte(h.regs.pc + 1))) & 0xffff; return {pc: 0, cycle: 12};}
function JR_C(h){ if(!h.f_carry()) return {pc: 2, cycle: 8}; h.regs.pc = (h.regs.pc + 2 + to_signed_int8(h.mmu.read_byte(h.regs.pc + 1))) & 0xffff; return {pc: 0, cycle: 12};}

function JP(h){h.regs.pc = h.mmu.read_word(h.regs.pc + 1); return {pc: 0, cycle: 16};}
function JP_HL(h){ h.regs.pc = (h.regs.h << 8) + h.regs.l; return {pc: 0, cycle: 4};}
function JP_NZ(h){ if(!h.f_zero()) return JP(h); return {pc: 3, cycle: 12};}
function JP_Z(h){ if(h.f_zero()) return JP(h); return {pc: 3, cycle: 12};}
function JP_NC(h){ if(!h.f_carry()) return JP(h); return {pc: 3, cycle: 12};}
function JP_C(h){ if(h.f_carry()) return JP(h); return {pc: 3, cycle: 12};}

function CALL(h){ h.stack_push_16(h.regs.pc + 3); h.regs.pc = h.mmu.read_word(h.regs.pc + 1); return {pc: 0, cycle: 24};}
function CALL_NZ(h){ if(!h.f_zero()) return CALL(h); return {pc: 3, cycle: 12}}
function CALL_Z(h){ if(h.f_zero()) return CALL(h); return {pc: 3, cycle: 12}}
function CALL_NC(h){ if(!h.f_carry()) return CALL(h); return {pc: 3, cycle: 12}}
function CALL_C(h){ if(h.f_carry()) return CALL(h); return {pc: 3, cycle: 12}}

function RET(h){ h.regs.pc = h.stack_pop_16(); return {pc: 0, cycle: 16};}
function RET_NZ(h){if(!h.f_zero()) return tested_ret(h); return {pc: 1, cycle: 8};}
function RET_Z(h){if(h.f_zero()) return tested_ret(h); return {pc: 1, cycle: 8};}
function RET_NC(h){if(!h.f_carry()) return tested_ret(h); return {pc: 1, cycle: 8};}
function RET_C(h){if(h.f_carry()) return tested_ret(h); return {pc: 1, cycle: 8};}
function RETI(h){ h.enable_int_master(); return RET(h);}

function RST_00(h){ h.rst_at(0x00); return {pc: 0, cycle: 16};}
function RST_08(h){ h.rst_at(0x08); return {pc: 0, cycle: 16};}
function RST_10(h){ h.rst_at(0x10); return {pc: 0, cycle: 16};}
function RST_18(h){ h.rst_at(0x18); return {pc: 0, cycle: 16};}
function RST_20(h){ h.rst_at(0x20); return {pc: 0, cycle: 16};}
function RST_28(h){ h.rst_at(0x28); return {pc: 0, cycle: 16};}
function RST_30(h){ h.rst_at(0x30); return {pc: 0, cycle: 16};}
function RST_38(h){ h.rst_at(0x38); return {pc: 0, cycle: 16};}

//Memory loads
function LD_BCM_A(h){ h.mmu.write_byte((h.regs.b << 8) + h.regs.c, h.regs.a); return {pc: 1, cycle: 8};}
function LD_DEM_A(h){ h.mmu.write_byte((h.regs.d << 8) + h.regs.e, h.regs.a); return {pc: 1, cycle: 8};}
function LD_HLM_A(h){ h.mmu.write_byte((h.regs.h << 8) + h.regs.l, h.regs.a); return {pc: 1, cycle: 8};}
function LD_A_BCM(h){ h.regs.a = h.mmu.read_byte((h.regs.b << 8) + h.regs.c); return {pc: 1, cycle: 8};}
function LD_A_DEM(h){ h.regs.a = h.mmu.read_byte((h.regs.d << 8) + h.regs.e); return {pc: 1, cycle: 8};}

function LD_IMM16M_SP(h){h.mmu.write_word(h.mmu.read_word(h.regs.pc + 1) ,h.regs.sp); return {pc: 3, cycle: 20};}

function LD_HLMI_A(h){ LD_HLM_A(h); INC_HL(h); return {pc: 1, cycle: 8};}
function LD_HLMD_A(h){ LD_HLM_A(h); DEC_HL(h); return {pc: 1, cycle: 8};}
function LD_A_HLMI(h){ h.regs.a = h.mmu.read_byte((h.regs.h << 8) + h.regs.l); INC_HL(h); return {pc: 1, cycle: 8};}
function LD_A_HLMD(h){ h.regs.a = h.mmu.read_byte((h.regs.h << 8) + h.regs.l); DEC_HL(h); return {pc: 1, cycle: 8};}

function LD_A_CM(h){ h.regs.a = h.mmu.read_byte(0xff00 + h.regs.c); return {pc: 1, cycle: 8};}
function LD_CM_A(h){ h.mmu.write_byte(0xff00 + h.regs.c, h.regs.a); return {pc: 1, cycle: 8};}
function LD_HIMM8_A(h){ h.mmu.write_byte(0xff00 + h.mmu.read_byte(h.regs.pc + 1), h.regs.a); return {pc: 2, cycle: 12};}
function LD_A_HIMM8(h){ h.regs.a = h.mmu.read_byte(0xff00 + h.mmu.read_byte(h.regs.pc + 1)); return {pc: 2, cycle: 12};}

//8 bit loads
function LD_C_IMM8(h){ h.regs.c = h.mmu.read_byte(h.regs.pc + 1); return {pc: 2, cycle: 8};}
function LD_E_IMM8(h){ h.regs.e = h.mmu.read_byte(h.regs.pc + 1); return {pc: 2, cycle: 8};}
function LD_L_IMM8(h){ h.regs.l = h.mmu.read_byte(h.regs.pc + 1); return {pc: 2, cycle: 8};}
function LD_A_IMM8(h){ h.regs.a = h.mmu.read_byte(h.regs.pc + 1); return {pc: 2, cycle: 8};}
function LD_B_IMM8(h){ h.regs.b = h.mmu.read_byte(h.regs.pc + 1); return {pc: 2, cycle: 8};}
function LD_D_IMM8(h){ h.regs.d = h.mmu.read_byte(h.regs.pc + 1); return {pc: 2, cycle: 8};}
function LD_H_IMM8(h){ h.regs.h = h.mmu.read_byte(h.regs.pc + 1); return {pc: 2, cycle: 8};}
function LD_HLM_IMM8(h){ h.mmu.write_byte((h.regs.h << 8) + h.regs.l, h.mmu.read_byte(h.regs.pc + 1)); return {pc: 2, cycle: 12};}

function LD_IMM16M_A(h){ h.mmu.write_byte(h.mmu.read_word(h.regs.pc + 1), h.regs.a); return {pc: 3, cycle: 16};}
function LD_A_IMM16M(h){ h.regs.a = h.mmu.read_byte(h.mmu.read_word(h.regs.pc + 1)); return {pc: 3, cycle: 16};}

//16 bit loads
function LD_BC_IMM16(h){ h.regs.c = h.mmu.read_byte(h.regs.pc + 1); h.regs.b = h.mmu.read_byte(h.regs.pc + 2); return {pc: 3, cycle: 12};}
function LD_DE_IMM16(h){ h.regs.e = h.mmu.read_byte(h.regs.pc + 1); h.regs.d = h.mmu.read_byte(h.regs.pc + 2); return {pc: 3, cycle: 12};}
function LD_HL_IMM16(h){ h.regs.l = h.mmu.read_byte(h.regs.pc + 1); h.regs.h = h.mmu.read_byte(h.regs.pc + 2); return {pc: 3, cycle: 12};}
function LD_SP_IMM16(h){ h.regs.sp = h.mmu.read_word(h.regs.pc + 1); return {pc: 3, cycle: 12};}

function LD_SP_HL(h){ h.regs.sp = (h.regs.h << 8) + h.regs.l; return {pc: 1, cycle: 8};}

//Stack
function PUSH_AF(h){ h.stack_push_16((h.regs.a << 8) + h.regs.f); return {pc: 1, cycle: 16};}
function PUSH_BC(h){ h.stack_push_16((h.regs.b << 8) + h.regs.c); return {pc: 1, cycle: 16};}
function PUSH_DE(h){ h.stack_push_16((h.regs.d << 8) + h.regs.e); return {pc: 1, cycle: 16};}
function PUSH_HL(h){ h.stack_push_16((h.regs.h << 8) + h.regs.l); return {pc: 1, cycle: 16};}

function POP_AF(h){
    let v = h.stack_pop_16();
    h.regs.a = v >> 8;
    h.regs.f = v & 0xff;
    h.regs.f &= 0xf0;
    return {pc: 1, cycle: 12};

}
function POP_BC(h){ let v = h.stack_pop_16(); h.regs.b = v >> 8; h.regs.c = v & 0xff; return {pc: 1, cycle: 12};}
function POP_DE(h){ let v = h.stack_pop_16(); h.regs.d = v >> 8; h.regs.e = v & 0xff; return {pc: 1, cycle: 12};}
function POP_HL(h){ let v = h.stack_pop_16(); h.regs.h = v >> 8; h.regs.l = v & 0xff; return {pc: 1, cycle: 12};}


//8 bit INC, DEC
function INC_B(h){ if(half_carry_add8(h.regs.b, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.b++; h.regs.b &= 0xff; h.f_reset_sub(); if(h.regs.b) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function INC_D(h){ if(half_carry_add8(h.regs.d, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.d++; h.regs.d &= 0xff; h.f_reset_sub(); if(h.regs.d) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function INC_H(h){ if(half_carry_add8(h.regs.h, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.h++; h.regs.h &= 0xff; h.f_reset_sub(); if(h.regs.h) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function INC_HLM(h){ let addr = (h.regs.h << 8) + h.regs.l; let v = h.mmu.read_byte(addr); if(half_carry_add8(v, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); let nv = (v + 1) & 0xff; h.mmu.write_byte(addr, nv); h.f_reset_sub(); if(nv) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 12};}

function INC_C(h){ if(half_carry_add8(h.regs.c, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.c++; h.regs.c &= 0xff; h.f_reset_sub(); if(h.regs.c) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function INC_E(h){ if(half_carry_add8(h.regs.e, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.e++; h.regs.e &= 0xff; h.f_reset_sub(); if(h.regs.e) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function INC_L(h){ if(half_carry_add8(h.regs.l, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.l++; h.regs.l &= 0xff; h.f_reset_sub(); if(h.regs.l) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function INC_A(h){ if(half_carry_add8(h.regs.a, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.a++; h.regs.a &= 0xff; h.f_reset_sub(); if(h.regs.a) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}

function DEC_B(h){ h.f_set_sub(); if(half_carry_sub8(h.regs.b, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.b--; h.regs.b &= 0xff; if(h.regs.b) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function DEC_D(h){ h.f_set_sub(); if(half_carry_sub8(h.regs.d, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.d--; h.regs.d &= 0xff; if(h.regs.d) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function DEC_H(h){ h.f_set_sub(); if(half_carry_sub8(h.regs.h, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.h--; h.regs.h &= 0xff; if(h.regs.h) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function DEC_HLM(h){ h.f_set_sub(); let addr = (h.regs.h << 8) + h.regs.l; let v = h.mmu.read_byte(addr); if(half_carry_sub8(v, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); let nv = (v - 1) & 0xff; h.mmu.write_byte(addr, nv); if(nv) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 12};}

function DEC_C(h){ h.f_set_sub(); if(half_carry_sub8(h.regs.c, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.c--; h.regs.c &= 0xff; if(h.regs.c) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function DEC_E(h){ h.f_set_sub(); if(half_carry_sub8(h.regs.e, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.e--; h.regs.e &= 0xff; if(h.regs.e) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function DEC_L(h){ h.f_set_sub(); if(half_carry_sub8(h.regs.l, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.l--; h.regs.l &= 0xff; if(h.regs.l) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}
function DEC_A(h){ h.f_set_sub(); if(half_carry_sub8(h.regs.a, 1)) h.f_set_hcarry(); else h.f_reset_hcarry(); h.regs.a--; h.regs.a &= 0xff; if(h.regs.a) h.f_reset_zero(); else h.f_set_zero(); return {pc: 1, cycle: 4};}


//XORs
//These block has been replaced by general_alu
// function XOR_A(h){ h.regs.a ^= h.regs.a; h.f_reset(); h.f_set_zero(); return {pc: 1, cycle: 4};}
// function XOR_B(h){ h.regs.a ^= h.regs.b; h.f_reset(); if(h.regs.a === 0x0){ h.f_set_zero();} return {pc: 1, cycle: 4};}
// function XOR_C(h){ h.regs.a ^= h.regs.c; h.f_reset(); if(h.regs.a === 0x0){ h.f_set_zero();} return {pc: 1, cycle: 4};}
// function XOR_D(h){ h.regs.a ^= h.regs.d; h.f_reset(); if(h.regs.a === 0x0){ h.f_set_zero();} return {pc: 1, cycle: 4};}
// function XOR_E(h){ h.regs.a ^= h.regs.e; h.f_reset(); if(h.regs.a === 0x0){ h.f_set_zero();} return {pc: 1, cycle: 4};}
// function XOR_H(h){ h.regs.a ^= h.regs.h; h.f_reset(); if(h.regs.a === 0x0){ h.f_set_zero();} return {pc: 1, cycle: 4};}
// function XOR_L(h){ h.regs.a ^= h.regs.l; h.f_reset(); if(h.regs.a === 0x0){ h.f_set_zero();} return {pc: 1, cycle: 4};}
// function XOR_HL(h){h.regs.a ^= h.mmu.read_byte((h.regs.h << 8) + h.regs.l); h.f_reset(); if(h.regs.a === 0x0){ h.f_set_zero();} return {pc: 1, cycle: 8};}

//Other ALU
function XOR_IMM8(h){h.regs.a ^= h.mmu.read_byte(h.regs.pc + 1); h.f_reset(); if(h.regs.a === 0x0){ h.f_set_zero();} return {pc: 2, cycle: 8};}
function ADD_IMM8(h){ h.f_reset(); let rf = h.mmu.read_byte(h.regs.pc + 1); let t = h.regs.a + rf; change_half_carry(h, half_carry_add8(h.regs.a, rf)); change_carry(h, t > 0xff); change_zero(h, (t & 0xff) === 0); h.f_reset_sub(); h.regs.a = t & 0xff; return {pc: 2, cycle: 8};}
function SUB_IMM8(h){ h.f_reset(); let rf = h.mmu.read_byte(h.regs.pc + 1); let t = h.regs.a - rf; change_half_carry(h, half_carry_sub8(h.regs.a, rf)); change_carry(h, t < 0); change_zero(h, (t & 0xff) === 0); h.f_set_sub(); h.regs.a = t & 0xff; return {pc: 2, cycle: 8};}
function AND_IMM8(h){ h.f_reset(); let t = h.regs.a & h.mmu.read_byte(h.regs.pc + 1); change_zero(h, (t & 0xff) === 0); h.f_set_hcarry(); h.regs.a = t; return {pc: 2, cycle: 8};}
function OR_IMM8(h){ h.f_reset(); let rf = h.mmu.read_byte(h.regs.pc + 1); let t = h.regs.a | rf; change_zero(h, (t & 0xff) === 0); h.regs.a = t; return {pc: 2, cycle: 8};}
function ADC_IMM8(h){ h.f_reset(); let rf = h.mmu.read_byte(h.regs.pc + 1); let t = h.regs.a + rf + (h.f_carry()? 1 : 0); change_half_carry(h, half_carry_add8(h.regs.a, rf + (h.f_carry()? 1 : 0))); change_carry(h, t > 0xff); change_zero(h, (t & 0xff) === 0); h.f_reset_sub(); h.regs.a = t & 0xff; return {pc: 2, cycle: 8};}
function SBC_IMM8(h){ h.f_reset(); let rf = h.mmu.read_byte(h.regs.pc + 1); let t = h.regs.a - (rf + (h.f_carry()? 1 : 0)); change_half_carry(h, half_carry_sub8(h.regs.a, (rf + (h.f_carry()? 1 : 0)))); change_carry(h, t < 0); change_zero(h, (t & 0xff) === 0); h.f_set_sub(); h.regs.a = t & 0xff; return {pc: 2, cycle: 8};}
function CP_IMM8(h){let imm = h.mmu.read_byte(h.regs.pc + 1);if(h.regs.a === imm) h.f_set_zero(); else h.f_reset_zero(); h.f_set_sub(); if(half_carry_sub8(h.regs.a - imm)) h.f_set_hcarry(); else h.f_reset_hcarry(); if(h.regs.a < imm) h.f_set_carry(); else h.f_reset_carry(); return {pc: 2, cycle: 8};}

function ADD_SP_IMM8S(h){ h.f_reset(); let adder = h.mmu.read_byte(h.regs.pc + 1); let r = h.regs.sp + to_signed_int8(adder); change_half_carry(h, half_carry_add16(h.regs.sp, adder)); change_carry(h, r > 0xffff); h.regs.sp = r & 0xffff; return {pc: 2, cycle: 16};}
function LD_HL_SPIMM8S(h){ h.f_reset(); let adder = h.mmu.read_byte(h.regs.pc + 1); let r = h.regs.sp + to_signed_int8(adder); change_half_carry(h, half_carry_add16(h.regs.sp, adder)); change_carry(h, r > 0xffff); r = r & 0xffff; h.regs.h = r >> 8; h.regs.l = r & 0xff; return {pc: 2, cycle: 12};}

function CPL(h){ h.regs.a ^= 0xff; h.f_set_sub(); h.f_set_hcarry(); return {pc: 1, cycle: 4};}
function DAA(h){
    if(!h.f_sub()){
        if(h.f_carry() || h.regs.a > 0x99){
            h.regs.a = (h.regs.a + 0x60) & 0xff;
            h.f_set_carry();
        }
        if(h.f_hcarry() || (h.regs.a & 0xf) > 0x9){
            h.regs.a = (h.regs.a + 0x06) & 0xff;
            h.f_reset_hcarry();
        }
    } else if(h.f_carry() && h.f_hcarry()){
        h.regs.a = (h.regs.a + 0x9a) & 0xff;
        h.f_reset_hcarry();
    } else if(h.f_carry()){
        h.regs.a = (h.regs.a + 0xa0) & 0xff;
    } else if(h.f_hcarry()){
        h.regs.a = (h.regs.a + 0xfa) & 0xff;
        h.f_reset_hcarry();
    }

    change_zero(h, h.regs.a === 0);

    return {pc: 1, cycle: 4};
}
function SCF(h){ h.f_reset_sub(); h.f_reset_hcarry(); h.f_set_carry(); return {pc: 1, cycle: 4};}
function CCF(h){ h.f_reset_sub(); h.f_reset_hcarry(); change_carry(h, !h.f_carry()); return {pc: 1, cycle: 4};}

//16 bits ADD
function add_to_hl(h, v){
    h.f_reset_sub();
    let a = (h.regs.h << 8) + h.regs.l; let b = v; let t = a + b;
    change_zero(h, t === 0);
    change_half_carry(h, half_carry_add16(a,b));
    change_carry(h, t > 0xffff);
    h.regs.h = (t >> 8) & 0xff;
    h.regs.l = t & 0xff;
}

function ADD_HL_BC(h){ add_to_hl(h, (h.regs.b << 8) + h.regs.c); return {pc: 1, cycle: 8};}
function ADD_HL_DE(h){ add_to_hl(h, (h.regs.d << 8) + h.regs.e); return {pc: 1, cycle: 8};}
function ADD_HL_HL(h){ add_to_hl(h, (h.regs.h << 8) + h.regs.l); return {pc: 1, cycle: 8};}
function ADD_HL_SP(h){ add_to_hl(h, h.regs.sp); return {pc: 1, cycle: 8};}

//16 bits INCs
function INC_BC(h){ if(!(h.regs.c = (h.regs.c + 1) & 0xff)) h.regs.b = (h.regs.b + 1) & 0xff; return {pc: 1, cycle: 8};}
function INC_DE(h){ if(!(h.regs.e = (h.regs.e + 1) & 0xff)) h.regs.d = (h.regs.d + 1) & 0xff; return {pc: 1, cycle: 8};}
function INC_HL(h){ if(!(h.regs.l = (h.regs.l + 1) & 0xff)) h.regs.h = (h.regs.h + 1) & 0xff; return {pc: 1, cycle: 8};}
function INC_SP(h){ h.regs.sp = (h.regs.sp + 1) & 0xffff; return {pc: 1, cycle: 8};}

//16 bits DECs
function DEC_BC(h){ if((h.regs.c = (h.regs.c - 1) & 0xff) === 0xff) h.regs.b = (h.regs.b - 1) & 0xff; return {pc: 1, cycle: 8};}
function DEC_DE(h){ if((h.regs.e = (h.regs.e - 1) & 0xff) === 0xff) h.regs.d = (h.regs.d - 1) & 0xff; return {pc: 1, cycle: 8};}
function DEC_HL(h){ if((h.regs.l = (h.regs.l - 1) & 0xff) === 0xff) h.regs.h = (h.regs.h - 1) & 0xff; return {pc: 1, cycle: 8};}
function DEC_SP(h){ h.regs.sp = (h.regs.sp - 1) & 0xffff; return {pc: 1, cycle: 8};}

//Rotation and Bit shift
function RLCA(h){ h.f_reset(); if(h.regs.a & 0x80) h.f_set_carry(); h.regs.a = rotate(h.regs.a, 1); return {pc: 1, cycle: 4};}
function RLA(h) { let l = h.f_carry(); h.f_reset(); if(h.regs.a & 0x80) h.f_set_carry(); h.regs.a = ((h.regs.a << 1) & 0xff) + l; return {pc: 1, cycle: 4};}
function RRCA(h){h.f_reset();if(h.regs.a & 0x01) h.f_set_carry();h.regs.a = rotate(h.regs.a, -1);return {pc: 1, cycle: 4};}
function RRA(h) {let l = h.f_carry();h.f_reset();if(h.regs.a & 0x01) h.f_set_carry();h.regs.a = ((h.regs.a >> 1) & 0xff) + (l << 7); return {pc: 1, cycle: 4};}

function DI(h){ h.disable_int_master(); return {pc: 1, cycle: 4};}
function EI(h){ h.enable_int_master(); return {pc: 1, cycle: 4};}

function HALT(h) { throw "CPU Halted :(";}

//Helpers
function tested_ret(h){h.regs.pc = h.stack_pop_16(); return {pc: 0, cycle: 20};}

function half_carry_add8(a, b){ return ((a & 0xf) + (b & 0xf)) > 0xf;}
function half_carry_add16(a, b){ return ((a & 0xfff) + (b & 0xfff)) > 0xfff;}
function half_carry_sub8(a, b){ return ((a & 0xf) - (b & 0xf)) < 0;}

function EXT(h){
    let op = h.mmu.read_byte(h.regs.pc + 1);
    return {pc: 2, cycle: ext_handler(h, op)};
}

function get_ins_name(code){
    switch (code & 0xc0) {
        case 0x40: return "some load";
        case 0x80: return "some alu";
        default:
            return map[code].name;
    }
}

function handler(h, code){
    switch (code & 0xc0) {
        case 0x40: return general_loads(h, code);
        case 0x80: return general_alu(h, code);
        default:
            if(!(code in map))
                throw `Fatal: 0x${code.toString(16)} not implemented`;
            return map[code](h);
    }
}

function general_loads(h, code){
    let to = (code >> 3) & 0x7;
    let from = code & 0x7;
    if(to === 0x6 && from === 0x6) return map[code](h);
    else if(to === 0x6){
        h.mmu.write_byte(h.get_reg(to), h.get_reg(from));
        return {pc: 1, cycle: 8};
    } else if(from === 0x6){
        h.set_reg(to, h.mmu.read_byte(h.get_reg(from)));
        return {pc: 1, cycle: 8};
    }

    h.set_reg(to, h.get_reg(from));
    return {pc: 1, cycle: 4};
}

function general_alu(h, code){
    let alu_code = (code >> 3) & 0x7;
    let reg_addr = code & 0x7;
    let rf = GET_REG(h, reg_addr);
    h.f_reset(); //Since all ALU instructions reset all flags.
    switch (alu_code) {
        case 0x0: { //ADD
            let t = h.regs.a + rf;
            change_half_carry(h, half_carry_add8(h.regs.a, rf));
            change_carry(h, t > 0xff);
            change_zero(h, !(t & 0xff));
            h.f_reset_sub();
            h.regs.a = t & 0xff;
            break;
        }

        case 0x1: { //ADC
            let t = h.regs.a + rf + (h.f_carry()? 1 : 0);
            change_half_carry(h, half_carry_add8(h.regs.a, rf + (h.f_carry()? 1 : 0)));
            change_carry(h, t > 0xff);
            change_zero(h, !(t & 0xff));
            h.f_reset_sub();
            h.regs.a = t & 0xff;
            break;
        }

        case 0x2: { //SUB
            let t = h.regs.a - rf;
            change_half_carry(h, half_carry_sub8(h.regs.a, rf));
            change_carry(h, t < 0);
            change_zero(h, !(t & 0xff));
            h.f_set_sub();
            h.regs.a = t & 0xff;
            break;
        }

        case 0x3: { //SBC
            let t = h.regs.a - (rf + (h.f_carry()? 1 : 0));
            change_half_carry(h, half_carry_sub8(h.regs.a, (rf + (h.f_carry()? 1 : 0))));
            change_carry(h, t < 0);
            change_zero(h, !(t & 0xff));
            h.f_set_sub();
            h.regs.a = t & 0xff;
            break;
        }

        case 0x4: { //AND
            let t = h.regs.a & rf;
            change_zero(h, !(t & 0xff));
            h.f_set_hcarry();
            h.regs.a = t;
            break;
        }

        case 0x5: { //XOR
            let t = h.regs.a ^ rf;
            change_zero(h, !(t & 0xff));
            h.regs.a = t;
            break;
        }

        case 0x6: { //OR
            let t = h.regs.a | rf;
            change_zero(h, !(t & 0xff));
            h.regs.a = t;
            break;
        }

        case 0x7: { //CP
            let t = h.regs.a - rf;
            change_half_carry(h, half_carry_sub8(h.regs.a, rf));
            change_carry(h, t < 0);
            change_zero(h, !(t & 0xff));
            h.f_set_sub();
            break;
        }

        default: throw "Something bad has happened.";
    }

    return reg_addr === 0x6? {pc: 1, cycle: 8} : {pc: 1, cycle: 4};
}

function change_half_carry(h, s){ if(s) h.f_set_hcarry(); else h.f_reset_hcarry();}
function change_carry(h, s){ if(s) h.f_set_carry(); else h.f_reset_carry();}
function change_zero(h, s){ if(s) h.f_set_zero(); else h.f_reset_zero();}

map = {
    0x00: NOP,
    0x07: RLCA, 0x17: RLA, 0x0f: RRCA, 0x1f: RRA,
    0x08: LD_IMM16M_SP,
    0x09: ADD_HL_BC, 0x19: ADD_HL_DE, 0x29: ADD_HL_HL, 0x39: ADD_HL_SP,
    0x0a: LD_A_BCM, 0x1a: LD_A_DEM, 0x2a: LD_A_HLMI, 0x3a: LD_A_HLMD,
    0x06: LD_B_IMM8, 0x16: LD_D_IMM8, 0x26: LD_H_IMM8, 0x36: LD_HLM_IMM8,
    0x0e: LD_C_IMM8, 0x1e: LD_E_IMM8, 0x2e: LD_L_IMM8, 0x3e: LD_A_IMM8,
    0x01: LD_BC_IMM16, 0x11: LD_DE_IMM16, 0x21: LD_HL_IMM16, 0x31: LD_SP_IMM16,
    0x02: LD_BCM_A, 0x12: LD_DEM_A, 0x22: LD_HLMI_A, 0x32: LD_HLMD_A,
    0x18: JR, 0x20: JR_NZ, 0x28: JR_Z, 0x30: JR_NC, 0x38: JR_C,
    0x27: DAA, 0x37: SCF, 0x2f: CPL, 0x3f: CCF,
    0x3c: INC_A, 0x04: INC_B, 0x0c: INC_C, 0x14: INC_D, 0x1c: INC_E, 0x24: INC_H, 0x2c: INC_L, 0x34: INC_HLM,
    0x3d: DEC_A, 0x05: DEC_B, 0x0d: DEC_C, 0x15: DEC_D, 0x1d: DEC_E, 0x25: DEC_H, 0x2d: DEC_L, 0x35: DEC_HLM,
    0x76: HALT, 0x10: STOP,
    0x77: LD_HLM_A,
    0x03: INC_BC, 0x13: INC_DE, 0x23: INC_HL, 0x33: INC_SP,
    0x0b: DEC_BC, 0x1b: DEC_DE, 0x2b: DEC_HL, 0x3b: DEC_SP,
    0xc2: JP_NZ, 0xc3: JP, 0xca: JP_Z, 0xd2: JP_NC, 0xda: JP_C, 0xe9: JP_HL,
    0xc6: ADD_IMM8, 0xd6: SUB_IMM8, 0xe6: AND_IMM8, 0xf6: OR_IMM8,
    0xc7: RST_00, 0xcf: RST_08, 0xd7: RST_10, 0xdf: RST_18, 0xe7: RST_20, 0xef: RST_28, 0xf7: RST_30, 0xff: RST_38,
    0xce: ADC_IMM8, 0xde: SBC_IMM8, 0xee: XOR_IMM8, 0xfe: CP_IMM8,
    0xc9: RET, 0xc0: RET_NZ, 0xc8: RET_Z, 0xd0: RET_NC, 0xd8: RET_C, 0xd9: RETI,
    0xcd: CALL, 0xc4: CALL_NZ, 0xcc: CALL_Z, 0xd4: CALL_NC, 0xdc: CALL_C,
    0xe0: LD_HIMM8_A, 0xf0: LD_A_HIMM8,
    0xe2: LD_CM_A, 0xf2: LD_A_CM,
    0xe8: ADD_SP_IMM8S,
    0xea: LD_IMM16M_A, 0xfa: LD_A_IMM16M,
    0xf1: POP_AF, 0xc1: POP_BC, 0xd1: POP_DE, 0xe1: POP_HL,
    0xf3: DI, 0xfb: EI,
    0xf5: PUSH_AF, 0xc5: PUSH_BC, 0xd5: PUSH_DE, 0xe5: PUSH_HL,
    0xf8: LD_HL_SPIMM8S, 0xf9: LD_SP_HL,
    0xcb: EXT
};

module.exports = {
    handler,
    get_ins_name
};