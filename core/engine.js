// QStorage
// Copyright 2019 Mr.Panda <xivistudios@gmail.com>
// MIT License
"use strict"


// Engine
// @class
function Engine (size, chunk) {
  this.DROP_BLOCKS = new Set()
  this.CHUNK_SIZE = size
  this.chunk = chunk
  this.INDEXS = {}
}


// data input.
// @params {string} key
// @params {buffer} value
// @public
Engine.prototype.insert = async function (key, value) {
  if (this.INDEXS[key]) {
    return false
  }
  
  // auto data.
  let block_indexs = []
  let block_index = 0
  let blocks = []
  
  // Non-Buffer to Buffer.
  if (!Buffer.isBuffer(value)) {
    value = Buffer.from(value)
  }
  
  // Split data into individual slices.
  // Split by slice size.
  // Insufficient fragment size default 0 padding.
  let block_size = Math.ceil(value.length / this.CHUNK_SIZE)
  for (let i = 0; i < block_size; i ++) {
    let offset = this.CHUNK_SIZE * i
    let bufs = Buffer.alloc(this.CHUNK_SIZE)
    value.copy(bufs, 0, offset, this.CHUNK_SIZE)
    blocks.push(bufs)
  }
  
  // Check if there are invalid fragments.
  // If there is implementation fragmentation.
  // Write failed fragment first.
  // traversing the failed fragmentation iterator.
  for (let offset of this.DROP_BLOCKS) {
    let block = blocks[block_index]

    // Check if the assignment has ended.
    // If the failed fragment is larger than the written fragment.
    // jump out of the loop.
    if (!block) {
      break 
    }
    
    // write by byte.
    // If the end has been written.
    // Now empty all unfilled bits to 0.
    void await this.chunk.write(block, offset)
    
    // increase the index.
    // Increase the index offset.
    // Delete the filled invalidation index.
    block_index += 1
    block_indexs.push(offset)
    this.DROP_BLOCKS.delete(offset)
  }
  
  // Processed failure fragmentation.
  // append to the end of the data area.
  let offset = this.chunk.len()
  for (let i = block_index; i < blocks.length; i ++) {
    void await this.chunk.write(blocks[i], offset)
    let block_len = blocks[i].length
    block_indexs.push(offset)
    offset += (i + 1) * block_len
  }
  
  // Cache segmentation information.
  // Cache key pair information.
  this.INDEXS[key] = {
    count: value.length,
    blocks: block_indexs
  }
}


// retrieve data.
// @params {string} key
// @public
Engine.prototype.get = async function (key) {
  let option = this.INDEXS[key]
  
  // Data does not exist.
  if (!option) {
    return null
  }
  
  // take the shard.
  // Extract data.
  let bufs = []
  let { count, blocks } = option
  for (let offset of blocks) {
    let data = await this.chunk.read(offset, this.CHUNK_SIZE)
    bufs.push(...data)
  }
  
  // Return data.
  let data = bufs.slice(0, count)
  return Buffer.from(data)
}


// delete data.
// @params {string} key
// @public
Engine.prototype.remove = function (key) {
  let option = this.INDEXS[key]
  
  // Data does not exist.
  if (!option) {
    return false
  }
  
  // delete data
  // mark the fragment as invalid
  let { blocks } = option
  delete this.INDEXS[key]
  blocks.forEach(x => this.DROP_BLOCKS.add(x))
  return true
}


// export.
module.exports = Engine