package com.khoavo.kvsynology.di

import com.khoavo.kvsynology.data.repository.*
import com.khoavo.kvsynology.domain.repository.*
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun bindSystemRepository(impl: SystemRepositoryImpl): SystemRepository

    @Binds
    @Singleton
    abstract fun bindFileStationRepository(impl: FileStationRepositoryImpl): FileStationRepository

    @Binds
    @Singleton
    abstract fun bindDockerRepository(impl: DockerRepositoryImpl): DockerRepository

    @Binds
    @Singleton
    abstract fun bindDownloadRepository(impl: DownloadRepositoryImpl): DownloadRepository

    @Binds
    @Singleton
    abstract fun bindStorageRepository(impl: StorageRepositoryImpl): StorageRepository

    @Binds
    @Singleton
    abstract fun bindPackageRepository(impl: PackageRepositoryImpl): PackageRepository

    @Binds
    @Singleton
    abstract fun bindServicesRepository(impl: ServicesRepositoryImpl): ServicesRepository

    @Binds
    @Singleton
    abstract fun bindSecurityRepository(impl: SecurityRepositoryImpl): SecurityRepository

    @Binds
    @Singleton
    abstract fun bindNotificationsRepository(impl: NotificationsRepositoryImpl): NotificationsRepository

    @Binds
    @Singleton
    abstract fun bindTrafficRepository(impl: TrafficRepositoryImpl): TrafficRepository

    @Binds
    @Singleton
    abstract fun bindSnmpRepository(impl: SnmpRepositoryImpl): SnmpRepository

    @Binds
    @Singleton
    abstract fun bindPermissionsRepository(impl: PermissionsRepositoryImpl): PermissionsRepository
}
