class I2CWrapper:
    def __init__(self, i2c, address):
        self._i2c = i2c
        self._addr = address

    def read_byte_data(self, addr, reg):
        return self._i2c.readfrom_mem(self._addr, reg, 1)[0]

    def write_byte_data(self, addr, reg, val):
        self._i2c.writeto_mem(self._addr, reg, bytes([val]))

    def read_i2c_block_data(self, addr, reg, length):
        resultado = []
        chunk_size = 32  # leer de 32 bytes a la vez
        offset = 0
        while offset < length:
            chunk = min(chunk_size, length - offset)
            datos = self._i2c.readfrom_mem(self._addr, reg + offset, chunk)
            resultado.extend(list(datos))
            offset += chunk
        return resultado
