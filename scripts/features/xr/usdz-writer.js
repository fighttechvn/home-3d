/**
 * Ghi ảnh chụp ngôi nhà (scene-snapshot.js) thành file USDZ cho AR Quick Look trên iPhone / iPad.
 *
 * Bản rút gọn theo USDZExporter của Three.js (MIT, các bản r12x–r15x), viết lại cho bản UMD r147 không có
 * exporter này và không cần thư viện nén: một lớp USDA dạng chữ, mỗi vật liệu một mặt lưới đã gộp,
 * vật liệu UsdPreviewSurface có màu / độ nhám / độ kim loại / độ trong và ảnh vân màu (PNG hoặc JPEG,
 * cạnh dài nhất 2048 px) nếu ảnh chụp giữ ảnh vân. Gói ZIP không nén, dữ liệu căn lề 64 byte đúng yêu cầu
 * của định dạng USDZ.
 */

const MAX_TEXTURE_SIZE = 2048;

const round = (value, factor) => (Math.round(value * factor) / factor) || 0; // || 0: bỏ "-0"

function formatTuples(values, factor) {
  const parts = new Array(values.length / 3);
  for (let index = 0, tuple = 0; index < values.length; index += 3, tuple++) {
    parts[tuple] = `(${round(values[index], factor)}, ${round(values[index + 1], factor)}, ${round(values[index + 2], factor)})`;
  }
  return parts.join(', ');
}

function formatFloat(value) { return String(round(value, 10000)); }

function formatPairs(values) {
  const parts = new Array(values.length / 2);
  for (let index = 0, pair = 0; index < values.length; index += 2, pair++) parts[pair] = `(${round(values[index], 10000)}, ${round(values[index + 1], 10000)})`;
  return parts.join(', ');
}

/** textureFiles: Map(texture → tên file trong gói). */
function buildUsda(snapshot, { scale = 1, name = 'House' } = {}, textureFiles = new Map()) {
  // Tên prim USD chỉ gồm chữ, số, gạch dưới và không bắt đầu bằng số; tên hiển thị giữ trong assetInfo.
  const displayName = String(name).replace(/["\\]/g, '');
  name = String(name).replace(/[^A-Za-z0-9_]/g, '_').replace(/^(?=\d)|^$/, '_');
  const lines = [
    '#usda 1.0',
    '(',
    '    customLayerData = {',
    '        string creator = "Garden House Studio"',
    '    }',
    `    defaultPrim = "${name}"`,
    '    metersPerUnit = 1',
    '    upAxis = "Y"',
    ')',
    '',
    `def Xform "${name}" (`,
    `    assetInfo = { string name = "${displayName}" }`,
    '    kind = "component"',
    ')',
    '{',
    `    float3 xformOp:scale = (${formatFloat(scale)}, ${formatFloat(scale)}, ${formatFloat(scale)})`,
    '    uniform token[] xformOpOrder = ["xformOp:scale"]',
    '',
  ];
  snapshot.buckets.forEach((bucket, index) => {
    const triangleCount = bucket.indices.length / 3;
    lines.push(
      `    def Mesh "Mesh_${index}" (`,
      '        prepend apiSchemas = ["MaterialBindingAPI"]',
      '    )',
      '    {',
      `        int[] faceVertexCounts = [${new Array(triangleCount).fill(3).join(', ')}]`,
      `        int[] faceVertexIndices = [${Array.prototype.join.call(bucket.indices, ', ')}]`,
      `        rel material:binding = </${name}/Materials/Material_${index}>`,
      `        normal3f[] normals = [${formatTuples(bucket.normals, 1000)}] (`,
      '            interpolation = "vertex"',
      '        )',
      `        point3f[] points = [${formatTuples(bucket.positions, 1000)}]`,
      ...(textureFiles.has(bucket.texture) ? [
        `        texCoord2f[] primvars:st = [${formatPairs(bucket.uvs)}] (`,
        '            interpolation = "vertex"',
        '        )',
      ] : []),
      `        uniform bool doubleSided = ${bucket.doubleSided ? 1 : 0}`,
      '        uniform token subdivisionScheme = "none"',
      '    }',
      '',
    );
  });
  lines.push('    def Scope "Materials"', '    {');
  snapshot.buckets.forEach((bucket, index) => {
    const [red, green, blue] = bucket.color.map(formatFloat);
    const path = `/${name}/Materials/Material_${index}`, textureFile = textureFiles.get(bucket.texture);
    const surfaceInputs = textureFile ? [
      `                color3f inputs:diffuseColor.connect = <${path}/DiffuseTexture.outputs:rgb>`,
      bucket.textureAlpha ? `                float inputs:opacity.connect = <${path}/DiffuseTexture.outputs:a>` : `                float inputs:opacity = ${formatFloat(bucket.opacity)}`,
      ...(bucket.alphaCutoff ? [`                float inputs:opacityThreshold = ${formatFloat(bucket.alphaCutoff)}`] : []),
    ] : [
      `                color3f inputs:diffuseColor = (${red}, ${green}, ${blue})`,
      `                float inputs:opacity = ${formatFloat(bucket.opacity)}`,
    ];
    lines.push(
      `        def Material "Material_${index}"`,
      '        {',
      `            token outputs:surface.connect = <${path}/Surface.outputs:surface>`,
      '',
      '            def Shader "Surface"',
      '            {',
      '                uniform token info:id = "UsdPreviewSurface"',
      ...surfaceInputs,
      `                float inputs:metallic = ${formatFloat(bucket.metalness)}`,
      `                float inputs:roughness = ${formatFloat(bucket.roughness)}`,
      '                int inputs:useSpecularWorkflow = 0',
      '                token outputs:surface',
      '            }',
    );
    if (textureFile) {
      lines.push(
        '',
        '            def Shader "PrimvarReader"',
        '            {',
        '                uniform token info:id = "UsdPrimvarReader_float2"',
        '                string inputs:varname = "st"',
        '                float2 outputs:result',
        '            }',
        '',
        '            def Shader "DiffuseTexture"',
        '            {',
        '                uniform token info:id = "UsdUVTexture"',
        `                asset inputs:file = @${textureFile}@`,
        `                float2 inputs:st.connect = <${path}/PrimvarReader.outputs:result>`,
        `                float4 inputs:scale = (${red}, ${green}, ${blue}, ${bucket.textureAlpha ? formatFloat(bucket.opacity) : 1})`,
        '                token inputs:sourceColorSpace = "sRGB"',
        '                token inputs:wrapS = "repeat"',
        '                token inputs:wrapT = "repeat"',
        '                float3 outputs:rgb',
        '                float outputs:a',
        '            }',
      );
    }
    lines.push('        }', '');
  });
  lines.push('    }', '}', '');
  return lines.join('\n');
}

/* ---------- ZIP không nén, căn lề 64 byte ---------- */
let crcTable = null;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let entry = 0; entry < 256; entry++) {
      let value = entry;
      for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      crcTable[entry] = value >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index++) crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const PADDING_EXTRA_ID = 12345; // cùng mã trường phụ mà USDZExporter của Three.js dùng để đệm

/** files: [{ name, data: Uint8Array }]. Trả về Uint8Array của gói USDZ. */
function zipStoreAligned(files) {
  const encoder = new TextEncoder(), chunks = [], centralEntries = [];
  let offset = 0;
  for (const file of files) {
    const nameBytes = encoder.encode(file.name), crc = crc32(file.data);
    const padding = (64 - ((offset + 30 + nameBytes.length + 4) % 64)) % 64, extraLength = 4 + padding;
    const header = new DataView(new ArrayBuffer(30 + nameBytes.length + extraLength));
    header.setUint32(0, 0x04034b50, true);         // chữ ký đầu mục
    header.setUint16(4, 20, true);                  // phiên bản cần để giải nén
    header.setUint16(6, 0, true);                   // cờ
    header.setUint16(8, 0, true);                   // không nén
    header.setUint16(10, 0, true); header.setUint16(12, 0x21, true); // giờ / ngày (1980-01-01)
    header.setUint32(14, crc, true);
    header.setUint32(18, file.data.length, true); header.setUint32(22, file.data.length, true);
    header.setUint16(26, nameBytes.length, true);
    header.setUint16(28, extraLength, true);
    new Uint8Array(header.buffer).set(nameBytes, 30);
    header.setUint16(30 + nameBytes.length, PADDING_EXTRA_ID, true);
    header.setUint16(32 + nameBytes.length, padding, true);
    centralEntries.push({ nameBytes, crc, size: file.data.length, offset });
    chunks.push(new Uint8Array(header.buffer), file.data);
    offset += header.byteLength + file.data.length;
  }
  const centralStart = offset;
  for (const entry of centralEntries) {
    const record = new DataView(new ArrayBuffer(46 + entry.nameBytes.length));
    record.setUint32(0, 0x02014b50, true);
    record.setUint16(4, 20, true); record.setUint16(6, 20, true);
    record.setUint16(8, 0, true); record.setUint16(10, 0, true);
    record.setUint16(12, 0, true); record.setUint16(14, 0x21, true);
    record.setUint32(16, entry.crc, true);
    record.setUint32(20, entry.size, true); record.setUint32(24, entry.size, true);
    record.setUint16(28, entry.nameBytes.length, true);
    record.setUint32(42, entry.offset, true);
    new Uint8Array(record.buffer).set(entry.nameBytes, 46);
    chunks.push(new Uint8Array(record.buffer));
    offset += record.byteLength;
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, offset - centralStart, true);
  end.setUint32(16, centralStart, true);
  chunks.push(new Uint8Array(end.buffer));
  const result = new Uint8Array(offset + 22);
  let position = 0;
  for (const chunk of chunks) { result.set(chunk, position); position += chunk.length; }
  return result;
}

/* ---------- ảnh vân ---------- */
const encodedTextures = new WeakMap(); // texture → Promise<{ data, extension }>

function canvasToBytes(canvas, type) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob) { reject(new Error('toBlob failed')); return; }
    blob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)), reject);
  }, type, 0.88));
}

/** Ảnh vẽ thẳng (không lật): toạ độ st của ảnh chụp đã theo quy ước USD. Có kênh alpha thì PNG, không thì JPEG cho nhẹ. */
function encodeTexture(texture, withAlpha) {
  if (encodedTextures.has(texture)) return encodedTextures.get(texture);
  const image = texture.image, ratio = Math.min(1, MAX_TEXTURE_SIZE / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  const type = withAlpha ? 'image/png' : 'image/jpeg';
  const promise = canvasToBytes(canvas, type).then(data => ({ data, extension: withAlpha ? 'png' : 'jpg' }));
  encodedTextures.set(texture, promise);
  return promise;
}

/**
 * Trả về Promise<Blob> kiểu model/vnd.usdz+zip. scale: 1 là kích thước thật, 1/30 là mô hình thu nhỏ.
 * Ảnh vân không đọc được (khác nguồn…) thì vật liệu đó dùng màu thay ảnh.
 */
export async function snapshotToUsdz(snapshot, options = {}) {
  const textureFiles = new Map(), files = [];
  const textures = [...new Set(snapshot.buckets.map(bucket => bucket.texture).filter(Boolean))];
  for (const [index, texture] of textures.entries()) {
    const withAlpha = snapshot.buckets.some(bucket => bucket.texture === texture && bucket.textureAlpha);
    try {
      const { data, extension } = await encodeTexture(texture, withAlpha);
      const fileName = `textures/Texture_${index}.${extension}`;
      textureFiles.set(texture, fileName);
      files.push({ name: fileName, data });
    } catch (error) { console.warn('[xr] texture skipped', error); }
  }
  const usda = new TextEncoder().encode(buildUsda(snapshot, options, textureFiles));
  // Lớp USDA phải là mục đầu tiên của gói.
  files.unshift({ name: options.fileName || 'house.usda', data: usda });
  return new Blob([zipStoreAligned(files)], { type: 'model/vnd.usdz+zip' });
}
