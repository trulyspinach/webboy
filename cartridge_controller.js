const fs = require('fs');
const tetris = require('./cartridges/tetris.js');

class CartridgeController{
    constructor(rom_file){
        if(rom_file === "t"){
            this.full_rom = tetris;
            return;
        }

        let s = fs.readFileSync(rom_file, 'hex');
        this.full_rom = [...Array(s.length / 2).keys()].map((_, i) => parseInt(s[i * 2] + s[i * 2 + 1], 16));
    }

    read_byte(addr){
        //TODO: bank switch reading.
        return this.full_rom[addr];
    }

    extract_rom(){
        let s = '';
        for(let i = 0; i < this.full_rom.length; i++){
            s += '0x' + this.full_rom[i].toString(16) + ',';
            if(i % 32 === 0) s += '\n';
        }

        fs.writeFileSync("./temp.rb", s);
    }

    // read_word(addr){
    //     return this.full_rom[addr] + (this.full_rom[addr + 1] << 8);
    // }

    write_byte(addr, v){
        console.log("Bank switch not implemented");
    }

    // write_word(addr, v){
    //     throw "Bank switch not implemented";
    // }


}

module.exports = CartridgeController;