function bitarray8r(v){
    return [...Array(8).keys()].map(i => (v >> (7 - i)) & 1);
}

function bitarray8(v){
    return [...Array(8).keys()].map(i => (v >> i) & 1);
}

function bitarray8_to_number(arr){
    return [...Array(8).keys()].map(i => (Math.pow(2, i) * arr[i])).reduce((a, b) => a + b, 0);
}

function bit_at(num, index){ return num & (0x1 << index);}

function to_signed_int8(v) {
    if(v & 0x80) {
        return -(~v & 0xff) - 1;
    }

    else return v & 0xff;
}

function rotate(value, vector){
    let wrapped = vector % 8;
    if(!wrapped) return value;
    if(wrapped < 0) wrapped += 8;
    return ((value << wrapped) | (value >> (8 - wrapped))) & 0xff;
}

module.exports = {
    bitarray8r,
    bitarray8,
    bitarray8_to_number,
    bit_at,
    to_signed_int8,
    rotate
};