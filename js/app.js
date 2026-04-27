const LIFF_ID = '2007753158-9x7MsRbe';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbynjzyQDNPDCrR8EtxFDo-zskBFSdRwwmWGzAdgGrqPTkgB9sx6Etvq1w8RKA1p8WMn/exec';
const MAKE_WEBHOOK = 'https://hook.us2.make.com/u2tzh7nu2re36nwsxmzciu4f3qx7xda9';

let currentType = 'employee';
let lineUserId = '';
let lineDisplayName = '';

async function initLiff() {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    const profile = await liff.getProfile();
    lineUserId = profile.userId;
    lineDisplayName = profile.displayName;
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('formScreen').style.display = 'block';
  } catch (err) {
    document.getElementById('loadingScreen').innerHTML = '<p style="color:#e53935;padding:20px">เกิดข้อผิดพลาด: ' + err.message + '</p>';
  }
}

function selectType(type) {
  currentType = type;
  document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-type="' + type + '"]').classList.add('active');
  ['employee','customer','supplier'].forEach(t => {
    document.getElementById('fields-' + t).style.display = t === type ? 'block' : 'none';
  });
}

function getFormData() {
  const data = { type: currentType, lineUserId, lineDisplayName, timestamp: new Date().toISOString() };
  if (currentType === 'employee') {
    data.name = document.getElementById('emp-name').value.trim();
    data.dept = document.getElementById('emp-dept').value;
    data.phone = document.getElementById('emp-phone').value.trim();
  } else if (currentType === 'customer') {
    data.name = document.getElementById('cus-name').value.trim();
    data.company = document.getElementById('cus-company').value.trim();
    data.phone = document.getElementById('cus-phone').value.trim();
    data.project = document.getElementById('cus-project').value.trim();
  } else {
    data.name = document.getElementById('sup-name').value.trim();
    data.company = document.getElementById('sup-company').value.trim();
    data.supType = document.getElementById('sup-type').value;
    data.phone = document.getElementById('sup-phone').value.trim();
  }
  return data;
}

function validate(data) {
  if (!data.name) return false;
  if (currentType === 'employee' && !data.dept) return false;
  if (currentType === 'customer' && (!data.company || !data.phone)) return false;
  if (currentType === 'supplier' && (!data.company || !data.supType || !data.phone)) return false;
  return true;
}

// แปลง dept → role ที่ Make webhook รับ
function deptToRole(dept) {
  if (dept === 'รปภ.') return 'รปภ';
  if (dept === 'โบว์เค้าท์') return 'โบว์เค้าท์';
  if (dept.startsWith('office') || dept === 'management') return 'office';
  return null;
}

function submitForm() {
  const data = getFormData();
  const errEl = document.getElementById('errorMsg');
  if (!validate(data)) {
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'กำลังบันทึก...';

  // 1) ส่งข้อมูลเข้า GAS → Sheet
  const params = new URLSearchParams();
  Object.keys(data).forEach(k => params.append(k, data[k]));
  new Image().src = GAS_URL + '?' + params.toString();

  // 2) ถ้าเป็น employee → call Make webhook เพื่อ assign Rich Menu
  if (currentType === 'employee' && data.lineUserId) {
    const role = deptToRole(data.dept);
    if (role) {
      fetch(MAKE_WEBHOOK, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.lineUserId, role: role })
      }).catch(function() {});
    }
  }

  // 3) แสดง success screen
  setTimeout(function() {
    document.getElementById('formScreen').style.display = 'none';
    const msg = currentType === 'employee'
      ? 'ระบบบันทึกข้อมูลแล้ว<br>เมนูจะเปลี่ยนโดยอัตโนมัติภายในไม่กี่วินาที'
      : 'ระบบบันทึกข้อมูลแล้ว<br>ทีมงาน WTC จะติดต่อกลับเร็วๆ นี้';
    document.getElementById('successMsg').innerHTML = msg;
    document.getElementById('successScreen').style.display = 'flex';
  }, 800);
}

initLiff();
