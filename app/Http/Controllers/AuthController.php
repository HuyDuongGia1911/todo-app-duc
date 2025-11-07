<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    //show view register don gian
    public function showRegister() {
        return view('register');
    }
    // xu ly dang ki
    public function register(Request $request) { //su dung request (ham cua lavarel, tham số $request lay du lieu nguoi nhap tu form)
        // $existingUser = DB::table('users')->where('email', $request->email)->first();
        $existingUser = User::where('email', $request->email)->first();

    if ($existingUser) {
        return back()->with('error', 'Email này có rồi mà???');
    }

    if (empty($request->name) || empty($request->email) || empty($request->password)) {
        return back()->with('error', 'Đủ ô ms dc qua bạn ơi');
    }

        // DB::table('users')->insert([ //chon bang user
        //     'name' => $request->name, //lay du lieu nguoi dung nhap
        //     'email' => $request->email, 
        //     'password' => Hash::make($request->password) //ma hoa mk
        // ]);
        User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);
        return redirect('/login')->with('success', 'Thành công. Qua login zô thử');
    }

    public function showLogin() {
        return view('login');
    }
public function login(Request $request) {
        // $user = DB::table('users')->where('email', $request->email)->first();
        $user = User::where('email', $request->email)->first();
         if (Auth::attempt(['email' => $request->email, 'password' => $request->password])) {
           

            return redirect('/dashboard')->with('success');
    }

        return back()->with('error', 'Lỗi');
    }

    public function dashboard() {
        return view('dashboard');
    }

    public function logout() {
        session()->forget('user');
        return redirect('/login');
    }
}
