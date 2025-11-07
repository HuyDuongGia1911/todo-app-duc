@extends('layouts.app')

@section('content')
<div class="container">
  
    <div id="summary-app"></div> {{-- React mount tại đây --}}
</div>
@endsection

@push('scripts')
    @viteReactRefresh
    @vite('resources/js/pages/SummaryIndex.jsx')
@endpush
