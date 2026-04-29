package com.watshop.cafe.orders

import android.os.Parcel
import android.os.Parcelable

/**
 * Compact projection of a new order — what the polling endpoint returns
 * and what we need to render the full-screen alert. Kept Parcelable so
 * we can pass it through Intent extras to OrderAlertActivity without a
 * JSON round-trip.
 */
data class NewOrder(
    val id: String,
    val orderNumber: String,
    val type: String,
    val customerName: String,
    val customerPhone: String,
    val totalAmount: Double,
    val itemCount: Int,
    val tableLabel: String,
    val createdAt: String,
) : Parcelable {

    constructor(parcel: Parcel) : this(
        parcel.readString().orEmpty(),
        parcel.readString().orEmpty(),
        parcel.readString().orEmpty(),
        parcel.readString().orEmpty(),
        parcel.readString().orEmpty(),
        parcel.readDouble(),
        parcel.readInt(),
        parcel.readString().orEmpty(),
        parcel.readString().orEmpty(),
    )

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(id)
        parcel.writeString(orderNumber)
        parcel.writeString(type)
        parcel.writeString(customerName)
        parcel.writeString(customerPhone)
        parcel.writeDouble(totalAmount)
        parcel.writeInt(itemCount)
        parcel.writeString(tableLabel)
        parcel.writeString(createdAt)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<NewOrder> {
        override fun createFromParcel(parcel: Parcel): NewOrder = NewOrder(parcel)
        override fun newArray(size: Int): Array<NewOrder?> = arrayOfNulls(size)
    }
}
