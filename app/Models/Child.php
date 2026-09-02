<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Child extends Model
{
    use HasFactory;

    protected $fillable = ['name'];

    public function parents(): HasMany
    {
        return $this->hasMany(ParentUser::class, 'child_id');
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class, 'child_id');
    }
}
