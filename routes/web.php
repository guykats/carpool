<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\DeployWebhookController;
use App\Http\Controllers\PairingController;
use App\Http\Controllers\ParentController;
use App\Http\Controllers\ShiftController;
use Illuminate\Support\Facades\Route;

// --- Public deploy webhook (see stackandhostingerdeploy.md) ---
Route::post('/deploy-webhook', DeployWebhookController::class);

// --- Identity ---
Route::get('/login', [ParentController::class, 'create'])->name('login');
Route::post('/parents', [ParentController::class, 'store']);

// --- Desktop-to-phone QR pairing (see PairingController) ---
Route::post('/pairing', [PairingController::class, 'store']);
Route::get('/pairing/{token}/status', [PairingController::class, 'status']);
Route::get('/pairing/{token}', [PairingController::class, 'page']);
Route::middleware('identify.parent')->post('/pairing/{token}/approve', [PairingController::class, 'approve']);

// --- Main board (identity resolved from X-Parent-Uuid header) ---
Route::middleware('identify.parent')->group(function () {
    Route::get('/', [ShiftController::class, 'index'])->name('home');
    Route::post('/shifts/{shift}/assign', [ShiftController::class, 'assign']);
    Route::post('/shifts/{shift}/cancel', [ShiftController::class, 'cancel']);

    // --- Admin panel ---
    Route::middleware('ensure.admin')->prefix('admin')->group(function () {
        Route::get('/', [AdminController::class, 'index'])->name('admin');
        Route::post('/children', [AdminController::class, 'storeChild']);
        Route::post('/children/{child}/delete', [AdminController::class, 'destroyChild']);
        Route::post('/parents/{parent}/reassign', [AdminController::class, 'reassignParent']);
        Route::post('/shifts/{shift}/override', [AdminController::class, 'overrideShift']);
        Route::post('/shifts/{shift}/time', [AdminController::class, 'editShiftTime']);
        Route::post('/settings', [AdminController::class, 'updateSettings']);
    });
});
