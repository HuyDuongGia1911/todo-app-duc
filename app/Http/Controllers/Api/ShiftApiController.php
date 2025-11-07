<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\Request;
//xử lý các api liên quan đến shift
class ShiftApiController extends Controller
{
    // Lấy danh sách shifts
    public function index()
    {
        return response()->json(Shift::all());//trả về dạng json dữ liệu full của shift
    }

    // Thêm mới shift
    public function store(Request $request)
    {
        $request->validate([
            'shift_name' => 'required|string|max:255', //kiểm tra bắt buộc, 255 toida,....
        ]);

        $shift = Shift::create([// thêm bản ghi vào 
            'shift_name' => $request->shift_name, 
        ]);

        return response()->json($shift, 201);//json tạo thành công, phần này qtrong, nó cho cilent biết đã làm gì
    }

    // Sửa shift
    public function update(Request $request, $id)
    {
        $request->validate([
            'shift_name' => 'required|string|max:255',
        ]);

        $shift = Shift::findOrFail($id);// tìm bản ghi theo id, ko có trẻ về 404
        $shift->update([ //cập nhật trường
            'shift_name' => $request->shift_name,
        ]);

        return response()->json($shift);
    }

    // Xoá shift
    public function destroy($id)
    {
        $shift = Shift::findOrFail($id); // tìm
        $shift->delete(); //xóa

        return response()->json(['success' => true]);// return json
    }
}
