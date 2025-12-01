@extends('layouts.app')

@section('content')
<div id="notifications-app"></div>
@endsection

@push('scripts')
	@vite('resources/js/notifications-page.jsx')
@endpush
