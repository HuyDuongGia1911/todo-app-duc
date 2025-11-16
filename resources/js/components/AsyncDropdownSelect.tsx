// import React, { useEffect, useState } from "react";
// import Select from "react-select";
// import CreatableSelect from "react-select/creatable";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import Swal from "sweetalert2";

// export default function AsyncDropdownSelect({
//   label,
//   name,
//   field,
//   api,
//   value,
//   onChange,
//   creatable = false,
//   // cho phép khác value/label/id khi cần (vd: users)
//   valueKey, // mặc định = field
//   labelKey, // mặc định = field
//   idKey = "id",
// }) {
//   const [options, setOptions] = useState<any[]>([]);
//   const [editingId, setEditingId] = useState<string | number | null>(null);
//   const [newValue, setNewValue] = useState("");
//   const csrf =
//     document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

//   // convert id "super-12" -> 12
//   const getRealId = (id: string | number) =>
//     typeof id === "string" && id.includes("-") ? id.split("-")[1] : id;

//   // Load dữ liệu
//   useEffect(() => {
//     const loadOptions = async () => {
//       try {
//         if (name === "supervisor") {
//           // merge supervisors + users (giữ logic cũ)
//           const [superRes, userRes] = await Promise.all([
//             fetch(api),
//             fetch("/api/users"),
//           ]);
//           const [supervisors, users] = await Promise.all([
//             superRes.json(),
//             userRes.json(),
//           ]);

//           const mappedSupers = (supervisors || []).map((s: any) => ({
//             id: `super-${s.id}`,
//             label: s.supervisor_name,
//             value: s.supervisor_name,
//             avatar: "https://www.w3schools.com/howto/img_avatar.png",
//           }));

//           const mappedUsers = (users || []).map((u: any) => ({
//             id: `user-${u.id}`,
//             label: u.name,
//             value: u.name,
//             avatar: u.avatar
//               ? `/storage/${u.avatar}`
//               : "https://www.w3schools.com/howto/img_avatar.png",
//           }));

//           // Ưu tiên user -> thêm supervisor nếu chưa trùng tên
//           const merged = [...mappedUsers];
//           mappedSupers.forEach((s) => {
//             const existsInUsers = mappedUsers.some((u) => u.value === s.value);
//             if (!existsInUsers) merged.push(s);
//           });

//           setOptions(merged);
//         } else {
//           const res = await fetch(api);
//           const data = await res.json();

//           const vKey = valueKey || field;
//           const lKey = labelKey || field;

//           const mapped = (data || []).map((item: any) => ({
//             id: item[idKey] ?? item.id,
//             value: item[vKey],
//             label: item[lKey],
//             avatar: item.avatar ? `/storage/${item.avatar}` : undefined,
//           }));
//           setOptions(mapped);
//         }
//       } catch (err) {
//         console.error(`Lỗi khi tải ${label}:`, err);
//       }
//     };

//     loadOptions();
//   }, [api, field, label, name, valueKey, labelKey, idKey]);

//   // change -> trả event giống input
//   const handleChange = (selected: any) => {
//     onChange({
//       target: {
//         name,
//         value: selected?.value ?? "",
//       },
//     });
//   };

//   // tạo mới (chỉ khi creatable)
//   const handleCreate = async (inputValue: string) => {
//     try {
//       const res = await fetch(api, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//           "X-CSRF-TOKEN": csrf!,
//         },
//         body: JSON.stringify({ [field]: inputValue }),
//       });
//       if (!res.ok) throw new Error("Tạo mới thất bại");

//       const item = await res.json();
//       const newOption = {
//         value: item[field],
//         label: item[field],
//         id: item[idKey] ?? item.id,
//       };

//       setOptions((prev) => [...prev, newOption]);
//       handleChange({ value: newOption.value });
//     } catch (err) {
//       console.error("Lỗi khi tạo mới:", err);
//       alert("Tạo mới thất bại!");
//     }
//   };

//   // xoá item
//   const handleDelete = async (id: string | number) => {
//     const result = await Swal.fire({
//       title: "Bạn có chắc chắn muốn xoá?",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Xoá",
//       cancelButtonText: "Huỷ",
//       confirmButtonColor: "#d33",
//       cancelButtonColor: "#3085d6",
//     });
//     if (!result.isConfirmed) return;

//     try {
//       const res = await fetch(`${api}/${getRealId(id)}`, {
//         method: "DELETE",
//         headers: {
//           Accept: "application/json",
//           "X-CSRF-TOKEN": csrf!,
//         },
//       });
//       if (!res.ok) throw new Error();

//       setOptions((prev) => prev.filter((o) => o.id !== id));
//       onChange({ target: { name, value: "" } });

//       await Swal.fire({
//         icon: "success",
//         title: "Đã xoá!",
//         text: "Mục đã được xoá thành công.",
//         timer: 1500,
//         showConfirmButton: false,
//       });
//     } catch {
//       await Swal.fire({
//         icon: "error",
//         title: "Lỗi!",
//         text: "Xoá thất bại!",
//       });
//     }
//   };

//   // sửa item
//   const handleEdit = async (id: string | number) => {
//     try {
//       const res = await fetch(`${api}/${getRealId(id)}`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//           "X-CSRF-TOKEN": csrf!,
//         },
//         body: JSON.stringify({ [field]: newValue }),
//       });
//       if (!res.ok) throw new Error("Sửa thất bại");

//       setOptions((prev) =>
//         prev.map((o) =>
//           o.id === id ? { ...o, label: newValue, value: newValue } : o
//         )
//       );

//       onChange({
//         target: { name, value: newValue },
//       });

//       setEditingId(null);
//       setNewValue("");
//     } catch (err) {
//       console.error("Lỗi:", err);
//       alert("Sửa thất bại");
//     }
//   };

//   const SelectComponent: any = creatable ? CreatableSelect : Select;
//   const withAvatar =
//     name === "supervisor" || name === "user_id" || name === "assigned_by";

//   // option đang chọn
//   const selectedOption =
//     value !== undefined && value !== null && value !== ""
//       ? options.find((opt) => String(opt.value) === String(value)) || null
//       : null;

//   // Quy tắc được phép sửa/xoá:
//   // - Nếu name === 'supervisor': CHỈ cho phép với item thuộc supervisors (id bắt đầu 'super-')
//   // - Các dropdown khác: nếu creatable = true thì cho phép sửa/xoá trực tiếp qua API đã truyền
//   const canMutateSelected =
//     creatable &&
//     selectedOption &&
//     (name !== "supervisor" ||
//       (typeof selectedOption.id === "string" &&
//         selectedOption.id.startsWith("super-")));

//   return (
//     <div className="mb-2">
//       <label className="form-label d-block">{label}</label>

//       <div className="d-flex align-items-center">
//         <div style={{ flex: 1 }}>
//           {editingId === null && (
//             <SelectComponent
//               value={selectedOption}
//               onChange={handleChange}
//               onCreateOption={creatable ? handleCreate : undefined}
//               options={options}
//               isClearable
//               placeholder="-- Chọn hoặc nhập mới --"
//               styles={{ menu: (base: any) => ({ ...base, zIndex: 9999 }) }}
//               formatOptionLabel={
//                 withAvatar
//                   ? (option: any) => (
//                       <div className="d-flex align-items-center">
//                         {option.avatar && (
//                           <img
//                             src={option.avatar}
//                             alt=""
//                             className="rounded-circle me-2"
//                             width={24}
//                             height={24}
//                           />
//                         )}
//                         <span>{option.label}</span>
//                       </div>
//                     )
//                   : undefined
//               }
//             />
//           )}
//         </div>

//         {/* Nút Sửa/Xoá cho item đang chọn (mở rộng so với bản cũ) */}
//         {canMutateSelected && editingId === null && (
//           <div className="ms-2 d-flex align-items-center">
//             <FaEdit
//               role="button"
//               className="text-primary me-2"
//               title="Sửa mục này"
//               onClick={() => {
//                 setEditingId(selectedOption!.id);
//                 setNewValue(selectedOption!.label);
//               }}
//             />
//             <FaTrash
//               role="button"
//               className="text-danger"
//               title="Xoá mục này"
//               onClick={() => handleDelete(selectedOption!.id)}
//             />
//           </div>
//         )}
//       </div>

//       {editingId !== null && (
//         <div className="mt-2 d-flex align-items-center">
//           <input
//             className="form-control form-control-sm me-2"
//             value={newValue}
//             onChange={(e) => setNewValue(e.target.value)}
//             onKeyDown={(e) => {
//               if (e.key === "Enter") {
//                 e.preventDefault();
//                 handleEdit(editingId);
//               }
//             }}
//           />
//           <button
//             type="button"
//             className="btn btn-sm btn-primary me-1"
//             onClick={() => handleEdit(editingId)}
//           >
//             Lưu
//           </button>
//           <button
//             type="button"
//             className="btn btn-sm btn-secondary"
//             onClick={() => {
//               setEditingId(null);
//               setNewValue("");
//             }}
//           >
//             Huỷ
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }


import React, { useEffect, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { FaEdit, FaTrash } from "react-icons/fa";
import Swal from "sweetalert2";

export default function AsyncDropdownSelect({
  label,
  name,
  field,
  api,
  value,
  onChange,
  creatable = false,
  multiple = false,      // ⭐ NEW: hỗ trợ multiple
  disabled = false,      // ⭐ NEW: hỗ trợ disable (view mode)
  // cho phép khác value/label/id khi cần (vd: users)
  valueKey, // mặc định = field
  labelKey, // mặc định = field
  idKey = "id",
}) {
  const [options, setOptions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [newValue, setNewValue] = useState("");
  const csrf =
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

  // convert id "super-12" -> 12
  const getRealId = (id: string | number) =>
    typeof id === "string" && id.includes("-") ? id.split("-")[1] : id;

  // Load dữ liệu
  useEffect(() => {
    const loadOptions = async () => {
      try {
        if (name === "supervisor") {
          // merge supervisors + users (giữ logic cũ)
          const [superRes, userRes] = await Promise.all([
            fetch(api),
            fetch("/api/users"),
          ]);
          const [supervisors, users] = await Promise.all([
            superRes.json(),
            userRes.json(),
          ]);

          const mappedSupers = (supervisors || []).map((s: any) => ({
            id: `super-${s.id}`,
            label: s.supervisor_name,
            value: s.supervisor_name,
            avatar: "https://www.w3schools.com/howto/img_avatar.png",
          }));

          const mappedUsers = (users || []).map((u: any) => ({
            id: `user-${u.id}`,
            label: u.name,
            value: u.name,
            avatar: u.avatar
              ? `/storage/${u.avatar}`
              : "https://www.w3schools.com/howto/img_avatar.png",
          }));

          // Ưu tiên user -> thêm supervisor nếu chưa trùng tên
          const merged = [...mappedUsers];
          mappedSupers.forEach((s) => {
            const existsInUsers = mappedUsers.some((u) => u.value === s.value);
            if (!existsInUsers) merged.push(s);
          });

          setOptions(merged);
        } else {
          const res = await fetch(api);
          const data = await res.json();

          const vKey = valueKey || field;
          const lKey = labelKey || field;

          const mapped = (data || []).map((item: any) => ({
            id: item[idKey] ?? item.id,
            value: item[vKey],
            label: item[lKey],
            avatar: item.avatar ? `/storage/${item.avatar}` : undefined,
          }));
          setOptions(mapped);
        }
      } catch (err) {
        console.error(`Lỗi khi tải ${label}:`, err);
      }
    };

    loadOptions();
  }, [api, field, label, name, valueKey, labelKey, idKey]);

  // ------- CHANGE VALUE --------
  const handleChange = (selected: any) => {
    if (multiple) {
      // ⭐ Khi multiple: trả về array value (vd: ['1','13'])
      const values = Array.isArray(selected)
        ? selected.map((s) => s.value)
        : [];
      onChange(values);
    } else {
      // ⭐ Giữ nguyên behavior cũ: trả event giống input
      onChange({
        target: {
          name,
          value: selected?.value ?? "",
        },
      });
    }
  };

  // tạo mới (chỉ khi creatable)
  const handleCreate = async (inputValue: string) => {
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrf!,
        },
        body: JSON.stringify({ [field]: inputValue }),
      });
      if (!res.ok) throw new Error("Tạo mới thất bại");

      const item = await res.json();
      const newOption = {
        value: item[field],
        label: item[field],
        id: item[idKey] ?? item.id,
      };

      setOptions((prev) => [...prev, newOption]);
      handleChange(newOption);
    } catch (err) {
      console.error("Lỗi khi tạo mới:", err);
      alert("Tạo mới thất bại!");
    }
  };

  // xoá item
  const handleDelete = async (id: string | number) => {
    const result = await Swal.fire({
      title: "Bạn có chắc chắn muốn xoá?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${api}/${getRealId(id)}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": csrf!,
        },
      });
      if (!res.ok) throw new Error();

      setOptions((prev) => prev.filter((o) => o.id !== id));

      if (!multiple) {
        onChange({ target: { name, value: "" } });
      } else {
        // multiple: xoá khỏi list hiện tại
        onChange(
          (prev: any[]) =>
            Array.isArray(prev) ? prev.filter((v) => v !== id) : []
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Đã xoá!",
        text: "Mục đã được xoá thành công.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Lỗi!",
        text: "Xoá thất bại!",
      });
    }
  };

  // sửa item
  const handleEdit = async (id: string | number) => {
    try {
      const res = await fetch(`${api}/${getRealId(id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrf!,
        },
        body: JSON.stringify({ [field]: newValue }),
      });
      if (!res.ok) throw new Error("Sửa thất bại");

      setOptions((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, label: newValue, value: newValue } : o
        )
      );

      if (!multiple) {
        onChange({
          target: { name, value: newValue },
        });
      }

      setEditingId(null);
      setNewValue("");
    } catch (err) {
      console.error("Lỗi:", err);
      alert("Sửa thất bại");
    }
  };

  const SelectComponent: any = creatable ? CreatableSelect : Select;

  const withAvatar =
    name === "supervisor" ||
    name === "user_id" ||
    name === "assigned_by" ||
    name === "receivers" || // ⭐ thêm cho các field mới
    name === "assigners" ||
    name === "supervisors";

  // option đang chọn (single vs multiple)
  let selectedOption: any = null;

  if (multiple) {
    const arr = Array.isArray(value) ? value.map((v) => String(v)) : [];
    selectedOption = options.filter((opt) =>
      arr.includes(String(opt.value))
    );
  } else {
    selectedOption =
      value !== undefined && value !== null && value !== ""
        ? options.find((opt) => String(opt.value) === String(value)) || null
        : null;
  }

  // được phép sửa/xoá?
  const canMutateSelected =
    !multiple && // ⭐ chỉ cho sửa/xoá ở chế độ single như cũ
    creatable &&
    selectedOption &&
    (name !== "supervisor" ||
      (typeof selectedOption.id === "string" &&
        selectedOption.id.startsWith("super-")));

  return (
    <div className="mb-2">
      {label && <label className="form-label d-block">{label}</label>}

      <div className="d-flex align-items-center">
        <div style={{ flex: 1 }}>
          {editingId === null && (
            <SelectComponent
              value={selectedOption}
              onChange={handleChange}
              onCreateOption={creatable ? handleCreate : undefined}
              options={options}
              isMulti={multiple}              // ⭐ multiple
              isDisabled={disabled}           // ⭐ disable
              isClearable={!multiple}
              placeholder="-- Chọn hoặc nhập mới --"
              styles={{ menu: (base: any) => ({ ...base, zIndex: 9999 }) }}
              formatOptionLabel={
                withAvatar
                  ? (option: any) => (
                    <div className="d-flex align-items-center">
                      {option.avatar && (
                        <img
                          src={option.avatar}
                          alt=""
                          className="rounded-circle me-2"
                          width={24}
                          height={24}
                        />
                      )}
                      <span>{option.label}</span>
                    </div>
                  )
                  : undefined
              }
            />
          )}
        </div>

        {canMutateSelected && editingId === null && (
          <div className="ms-2 d-flex align-items-center">
            <FaEdit
              role="button"
              className="text-primary me-2"
              title="Sửa mục này"
              onClick={() => {
                setEditingId(selectedOption!.id);
                setNewValue(selectedOption!.label);
              }}
            />
            <FaTrash
              role="button"
              className="text-danger"
              title="Xoá mục này"
              onClick={() => handleDelete(selectedOption!.id)}
            />
          </div>
        )}
      </div>

      {editingId !== null && (
        <div className="mt-2 d-flex align-items-center">
          <input
            className="form-control form-control-sm me-2"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleEdit(editingId);
              }
            }}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary me-1"
            onClick={() => handleEdit(editingId)}
          >
            Lưu
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setEditingId(null);
              setNewValue("");
            }}
          >
            Huỷ
          </button>
        </div>
      )}
    </div>
  );
}


