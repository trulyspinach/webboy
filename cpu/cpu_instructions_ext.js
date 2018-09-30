
function ext_handler(h, extcode){
    
    switch (extcode & 0xc0) {
        case 0x00:
            let fop = (extcode >> 3) & 0x7;
            let reg_addr = extcode & 0x07;
            h.f_reset();
            switch (fop) {
                case 0x00: //RLC
                    ROTATE(h, reg_addr, 1);
                    return reg_addr === 0x6 ? 16 : 8;

                case 0x01: //RRC
                    ROTATE(h, reg_addr, -1);
                    return reg_addr === 0x6 ? 16 : 8;

                case 0x02: //RL
                    let l = h.f_carry();
                    if(GET_REG(h, reg_addr) & 0x80) h.f_set_carry();
                    let tt = ((GET_REG(h, reg_addr) << 1) & 0xff) + l;
                    SET_REG(h, reg_addr, tt);
                    return reg_addr === 0x6 ? 16 : 8;

                case 0x03: //RR
                    let r = h.f_carry();
                    if(GET_REG(h, reg_addr) & 0x01) h.f_set_carry();
                    SET_REG(h, reg_addr, ((GET_REG(h, reg_addr) >> 1) & 0xff) + (r << 7));
                    return reg_addr === 0x6 ? 16 : 8;

                case 0x04: //SLA
                    let sla = GET_REG(h, reg_addr) << 1;
                    change_carry(h, sla > 0xff);
                    sla &= 0xff;
                    change_zero(h, !sla);
                    SET_REG(h, reg_addr, sla);
                    return reg_addr === 0x6 ? 16 : 8;

                case 0x05: //SRA
                    let sra = GET_REG(h, reg_addr);
                    change_carry(h, sra & 0x01);
                    let srr = ((sra & 0x7f) >> 1) + (sra & 0x80);
                    change_zero(h, !srr);
                    SET_REG(h, reg_addr, srr);
                    return reg_addr === 0x6 ? 16 : 8;

                case 0x06: //SWAP
                    let ss = GET_REG(h, reg_addr);
                    let ssr = (ss >> 4) + (ss & 0xf);
                    change_zero(h, !ssr);
                    SET_REG(h, reg_addr, ssr);
                    return reg_addr === 0x6 ? 16 : 8;

                case 0x07: //SRL
                    let srl = GET_REG(h, reg_addr);
                    change_carry(h, srl & 0x01);
                    SET_REG(h, reg_addr, srl >> 1);
                    return reg_addr === 0x6 ? 16 : 8;

                default:
                    throw `Fatal: EXT_FIRST_ROW$0x${extcode.toString(16)} ?`;
            }

        case 0x40: {//BIT [xx|xxx|xxx] opcode|b|register
            let addr = extcode & 0x7;
            let b = (extcode >> 3) & 0x7;
            BIT(h, b, addr);
            return addr === 0x6 ? 16 : 8;
        }

        case 0x80: {//RES
            let addr = extcode & 0x7;
            let b = (extcode >> 3) & 0x7;
            SET_REG(h, addr, GET_REG(h, addr) & (~(1 << b) & 0xff));
            return addr === 0x6 ? 16 : 8;
        }

        case 0xc0: {// SET
            let addr = extcode & 0x7;
            let b = (extcode >> 3) & 0x7;
            SET_REG(h, addr, GET_REG(h, addr) | (a << b));
            return addr === 0x6 ? 16 : 8;
        }
    }
    
    throw `Fatal: EXT$0x${extcode.toString(16)} not implemented`;
}


function GET_REG(h, addr){
    if(addr === 0x06) return h.mmu.read_byte(h.get_reg(addr));
    return h.get_reg(addr);
}

function SET_REG(h, addr, v){
    if(addr === 0x06){
        h.mmu.write_byte(h.get_reg(addr), v);
        return;
    }
    h.set_reg(addr, v);
}
function change_half_carry(h, s){ if(s) h.f_set_hcarry(); else h.f_reset_hcarry();}
function change_carry(h, s){ if(s) h.f_set_carry(); else h.f_reset_carry();}
function change_zero(h, s){ if(s) h.f_set_zero(); else h.f_reset_zero();}

/**
 * TODO: refactor with GET_REG and SET_REG
 * @return {number}
 */
function ROTATE(h, addr, vector){
    h.f_reset();
    let value = addr === 0x06? h.mmu.read_byte(h.get_reg(addr)) : h.get_reg(addr);
    if(value & (vector > 0? 0x80 : 0x01)) h.f_set_carry();
    let wrapped = vector % 8;
    if(!wrapped) return value;
    if(wrapped < 0) wrapped += 8;
    let res = ((value << wrapped) | (value >> (8 - wrapped))) & 0xff;
    if(!res) h.f_set_zero();
    if(addr === 0x06) h.mmu.write_byte(h.get_reg(addr), res);
    else h.set_reg(addr, res);
}

/*
 * TODO: refactor with GET_REG and SET_REG
 */
function BIT(h, b, addr){
    let v = addr === 0x06 ? h.mmu.read_byte(h.get_reg(addr)) : h.get_reg(addr);
    let res = v & (0x1 << b);
    if(res === 0) h.f_set_zero();
    else h.f_reset_zero();

    h.f_reset_sub();
    h.f_reset_hcarry();
}

module.exports = {
    ext_handler,
    GET_REG,
    SET_REG
};