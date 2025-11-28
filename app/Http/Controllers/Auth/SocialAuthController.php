<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Throwable $e) {
            report($e);
            return redirect()->route('login')->with('error', 'Đăng nhập Google thất bại, vui lòng thử lại.');
        }

        $email = $googleUser->getEmail();
        if (!$email) {
            return redirect()->route('login')->with('error', 'Không lấy được email từ Google. Vui lòng dùng tài khoản khác.');
        }

        $user = User::where('email', $email)->first();

        if (!$user) {
            $user = User::create([
                'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: 'Google User',
                'email' => $email,
                'password' => Hash::make(Str::random(40)),
                'avatar' => $googleUser->getAvatar(),
                'role' => 'Nhân viên',
            ]);
        } else {
            $user->update([
                'avatar' => $googleUser->getAvatar() ?? $user->avatar,
            ]);
        }

        Auth::login($user, true);

        return redirect()->intended('/dashboard');
    }

    public function redirectToFacebook()
    {
        return Socialite::driver('facebook')->redirect();
    }

    public function handleFacebookCallback()
    {
        try {
            $facebookUser = Socialite::driver('facebook')->user();
        } catch (\Throwable $e) {
            report($e);
            return redirect()->route('login')->with('error', 'Đăng nhập Facebook thất bại, vui lòng thử lại.');
        }

        $email = $facebookUser->getEmail();

        if (!$email) {
            return redirect()->route('login')->with('error', 'Facebook không trả về email. Vui lòng dùng tài khoản khác.');
        }

        $user = User::where('email', $email)->first();

        if (!$user) {
            $user = User::create([
                'name' => $facebookUser->getName() ?: $facebookUser->getNickname() ?: 'Facebook User',
                'email' => $email,
                'password' => Hash::make(Str::random(40)),
                'avatar' => $facebookUser->getAvatar(),
                'role' => 'Nhân viên',
            ]);
        } else {
            $user->update([
                'avatar' => $facebookUser->getAvatar() ?? $user->avatar,
            ]);
        }

        Auth::login($user, true);

        return redirect()->intended('/dashboard');
    }
}
